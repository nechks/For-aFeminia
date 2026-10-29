package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.*;
import br.org.atkdgv.forcafeminina.repo.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/historico-profissionais")
public class HistoricoProfissionalController {
  private static final Set<String> TIPOS =
      Set.of("AVALIACAO_POSITIVA", "AVALIACAO_NEGATIVA", "CONVERSA", "ADVERTENCIA", "OBSERVACAO");

  private final HistoricoProfissionalRepository historicos;
  private final UsuarioRepository usuarios;
  private final TurmaEquipeRepository equipe;
  private final TurmaRepository turmas;
  private final NucleoRepository nucleos;
  private final ProjetoRepository projetos;
  private final PresencaRepository presencas;
  private final RegistroAulaRepository registrosAula;

  public HistoricoProfissionalController(
      HistoricoProfissionalRepository historicos,
      UsuarioRepository usuarios,
      TurmaEquipeRepository equipe,
      TurmaRepository turmas,
      NucleoRepository nucleos,
      ProjetoRepository projetos,
      PresencaRepository presencas,
      RegistroAulaRepository registrosAula) {
    this.historicos = historicos;
    this.usuarios = usuarios;
    this.equipe = equipe;
    this.turmas = turmas;
    this.nucleos = nucleos;
    this.projetos = projetos;
    this.presencas = presencas;
    this.registrosAula = registrosAula;
  }

  @GetMapping("/meu")
  public Map<String, Object> meu() {
    Usuario atual = CurrentUser.get();
    return montarHistorico(atual, false);
  }

  @GetMapping
  public List<Map<String, Object>> listarProfissionais() {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    Map<String, Usuario> porId = new LinkedHashMap<>();
    for (TurmaEquipe vinculo : equipe.findAll()) {
      usuarios.findById(vinculo.getUserId()).filter(u -> !u.isExcluido()).ifPresent(u -> porId.put(u.getId(), u));
    }
    return porId.values().stream()
        .sorted(Comparator.comparing(Usuario::getName, String.CASE_INSENSITIVE_ORDER))
        .map(this::resumoProfissional)
        .toList();
  }

  @GetMapping("/{id}")
  public Map<String, Object> detalhe(@PathVariable String id) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    Usuario profissional = carregarProfissional(id);
    return montarHistorico(profissional, true);
  }

  public record NovoRegistro(
      String tipo,
      @JsonProperty("data_registro") String dataRegistro,
      String titulo,
      String descricao,
      @JsonProperty("visivel_profissional") Boolean visivelProfissional) {}

  @PostMapping("/{id}/registros")
  @Transactional
  public Map<String, Object> registrar(@PathVariable String id, @RequestBody NovoRegistro req) {
    Usuario autor = CurrentUser.require(Perfil.GESTAO_GERAL);
    carregarProfissional(id);
    if (req == null) throw invalid("Informe os dados do registro.");
    String tipo = req.tipo() == null ? "" : req.tipo().trim().toUpperCase();
    if (!TIPOS.contains(tipo)) throw invalid("Selecione um tipo de avaliação válido.");
    LocalDate data;
    try {
      data = LocalDate.parse(req.dataRegistro());
    } catch (Exception e) {
      throw invalid("Informe uma data válida.");
    }
    if (data.isAfter(LocalDate.now())) throw invalid("A data não pode estar no futuro.");
    if (req.titulo() == null || req.titulo().isBlank()) throw invalid("Informe um título.");
    if (req.descricao() == null || req.descricao().isBlank()) throw invalid("Descreva o registro.");

    HistoricoProfissional item = new HistoricoProfissional();
    item.setProfissionalId(id);
    item.setRegistradoPor(autor.getId());
    item.setTipo(tipo);
    item.setDataRegistro(data);
    item.setTitulo(req.titulo().trim());
    item.setDescricao(req.descricao().trim());
    item.setVisivelProfissional(!Boolean.FALSE.equals(req.visivelProfissional()));
    historicos.save(item);
    return mapRegistro(item, autor.getName());
  }

  private Usuario carregarProfissional(String id) {
    Usuario profissional =
        usuarios.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Profissional não encontrado."));
    if (equipe.findByUserIdOrderByCreatedDesc(id).isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "not_found", "Profissional sem histórico de atuação.");
    }
    return profissional;
  }

  private Map<String, Object> montarHistorico(Usuario profissional, boolean gestao) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("profissional", mapProfissional(profissional));
    body.put("participacoes", participacoes(profissional.getId()));
    body.put("assiduidade", Map.of(
        "chamadas_registradas", presencas.countChamadasRegistradasPor(profissional.getId()),
        "registros_aula", registrosAula.countByProfissionalId(profissional.getId())));
    List<HistoricoProfissional> lista = gestao
        ? historicos.findByProfissionalIdOrderByDataRegistroDescCreatedDesc(profissional.getId())
        : historicos.findByProfissionalIdAndVisivelProfissionalTrueOrderByDataRegistroDescCreatedDesc(profissional.getId());
    Map<String, String> autores = new HashMap<>();
    usuarios.findAllById(lista.stream().map(HistoricoProfissional::getRegistradoPor).distinct().toList())
        .forEach(u -> autores.put(u.getId(), u.getName()));
    body.put("registros", lista.stream().map(item -> mapRegistro(item, autores.getOrDefault(item.getRegistradoPor(), "Gestão Geral"))).toList());
    return body;
  }

  private List<Map<String, Object>> participacoes(String userId) {
    List<TurmaEquipe> vinculos = equipe.findByUserIdOrderByCreatedDesc(userId);
    Map<String, Turma> turmasPorId = new HashMap<>();
    turmas.findAllById(vinculos.stream().map(TurmaEquipe::getTurmaId).toList()).forEach(t -> turmasPorId.put(t.getId(), t));
    Map<String, Nucleo> nucleosPorId = new HashMap<>();
    nucleos.findAllById(turmasPorId.values().stream().map(Turma::getNucleoId).distinct().toList()).forEach(n -> nucleosPorId.put(n.getId(), n));
    Map<String, Projeto> projetosPorId = new HashMap<>();
    projetos.findAllById(nucleosPorId.values().stream().map(Nucleo::getProjetoId).filter(Objects::nonNull).distinct().toList()).forEach(p -> projetosPorId.put(p.getId(), p));
    List<Map<String, Object>> items = new ArrayList<>();
    for (TurmaEquipe vinculo : vinculos) {
      Turma turma = turmasPorId.get(vinculo.getTurmaId());
      Nucleo nucleo = turma == null ? null : nucleosPorId.get(turma.getNucleoId());
      Projeto projeto = nucleo == null ? null : projetosPorId.get(nucleo.getProjetoId());
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("projeto_nome", projeto == null ? "Projeto não informado" : projeto.getNome());
      item.put("nucleo_nome", nucleo == null ? "Núcleo não informado" : nucleo.getNome());
      item.put("turma_nome", turma == null ? "Turma não informada" : turma.getNome());
      item.put("tipo_profissional", vinculo.getTipoProfissional());
      item.put("inicio", vinculo.getCreated());
      item.put("fim", vinculo.isAtivo() ? null : vinculo.getUpdated());
      item.put("ativo", vinculo.isAtivo());
      items.add(item);
    }
    return items;
  }

  private Map<String, Object> resumoProfissional(Usuario u) {
    Map<String, Object> item = mapProfissional(u);
    item.put("vinculos", equipe.findByUserIdOrderByCreatedDesc(u.getId()).size());
    item.put("advertencias", historicos.findByProfissionalIdOrderByDataRegistroDescCreatedDesc(u.getId()).stream().filter(h -> "ADVERTENCIA".equals(h.getTipo())).count());
    return item;
  }

  private Map<String, Object> mapProfissional(Usuario u) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", u.getId()); item.put("nome", u.getName()); item.put("nome_social", u.getNomeSocial());
    item.put("email", u.getEmail()); item.put("avatar", u.getAvatar()); item.put("ativo", u.isAtivo());
    item.put("tipo_profissional", u.getTipoProfissional());
    return item;
  }

  private Map<String, Object> mapRegistro(HistoricoProfissional h, String autor) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", h.getId()); item.put("tipo", h.getTipo()); item.put("data_registro", h.getDataRegistro());
    item.put("titulo", h.getTitulo()); item.put("descricao", h.getDescricao());
    item.put("visivel_profissional", h.isVisivelProfissional()); item.put("registrado_por_nome", autor);
    item.put("created", h.getCreated());
    return item;
  }

  private ApiException invalid(String mensagem) {
    return new ApiException(HttpStatus.BAD_REQUEST, "validation_error", mensagem);
  }
}
