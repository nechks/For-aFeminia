package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.CicloAluna;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Projeto;
import br.org.atkdgv.forcafeminina.domain.ProjetoProfissional;
import br.org.atkdgv.forcafeminina.domain.StatusProjeto;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.CicloAlunaRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoProfissionalRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.service.CicloService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projetos")
public class ProjetoController {

  private final ProjetoRepository repo;
  private final ProjetoProfissionalRepository vinculos;
  private final UsuarioRepository usuarios;
  private final CicloAlunaRepository ciclos;
  private final CicloService ciclosService;

  public ProjetoController(
      ProjetoRepository repo,
      ProjetoProfissionalRepository vinculos,
      UsuarioRepository usuarios,
      CicloAlunaRepository ciclos,
      CicloService ciclosService) {
    this.repo = repo;
    this.vinculos = vinculos;
    this.usuarios = usuarios;
    this.ciclos = ciclos;
    this.ciclosService = ciclosService;
  }

  // ---------------------------------------------------------------- listagem

  /** Lista os projetos, opcionalmente filtrando por {@code status} (ATIVO, FINALIZADO, EM_ESPERA). */
  @GetMapping
  public List<Projeto> listar(@RequestParam(required = false) String status) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
      return repo.findAllByOrderByNomeAsc();
    }
    StatusProjeto filtro = StatusProjeto.parse(status);
    if (filtro == null) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "status_invalido", "Status de projeto inválido.");
    }
    return repo.findByStatusOrderByNomeAsc(filtro);
  }

  // ------------------------------------------------------------ criar/editar

  public record ProjetoRequest(
      String nome,
      String patrocinador,
      Integer capacidadeAlunas,
      String dataInicio,
      String dataTermino,
      String descricao,
      String status,
      @JsonProperty("espaco_kids") Boolean espacoKids,
      /** Profissionais que atuam no projeto. O vínculo é N:N e vive aqui, não na aprovação. */
      @JsonProperty("profissionais_ids") List<String> profissionaisIds) {}

  @PostMapping
  @Transactional
  public ResponseEntity<Projeto> criar(@RequestBody ProjetoRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    validar(req);
    Projeto p = new Projeto();
    aplicarCampos(p, req);
    p.setStatus(statusDe(req.status(), StatusProjeto.ATIVO));
    p.setCodigo(gerarCodigo(req.nome()));
    repo.save(p);
    if (req.profissionaisIds() != null) definirProfissionais(p.getId(), req.profissionaisIds());
    return ResponseEntity.status(HttpStatus.CREATED).body(p);
  }

  /**
   * Edita o projeto. Trocar o status para {@code FINALIZADO} encerra o acesso das alunas
   * vinculadas (sem apagar nada); voltar para {@code ATIVO} reabre o de quem não está aguardando
   * ficha de renovação.
   */
  @PutMapping("/{id}")
  @Transactional
  public Projeto editar(@PathVariable String id, @RequestBody ProjetoRequest req) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL);
    Projeto p = carregar(id);
    validar(req);
    aplicarCampos(p, req);

    StatusProjeto anterior = p.getStatus();
    StatusProjeto novo = statusDe(req.status(), anterior);
    p.setStatus(novo);
    p.setAtualizadoEm(Instant.now());
    p.setAtualizadoPor(atual.getId());
    p.setAtualizadoPorNome(atual.getName());
    repo.save(p);

    if (novo == StatusProjeto.FINALIZADO && anterior != StatusProjeto.FINALIZADO) {
      ciclosService.encerrarAcessoDasAlunas(p);
    } else if (novo == StatusProjeto.ATIVO && anterior == StatusProjeto.FINALIZADO) {
      ciclosService.reativarAcessoDasAlunas(p);
    }

    if (req.profissionaisIds() != null) definirProfissionais(p.getId(), req.profissionaisIds());
    return p;
  }

  // ------------------------------------------------------------ profissionais

  /** Profissionais vinculados ao projeto, para a tela de cadastro/edição já vir marcada. */
  @GetMapping("/{id}/profissionais")
  public List<Map<String, Object>> profissionais(@PathVariable String id) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    carregar(id);
    List<String> ids = vinculos.findByProjetoId(id).stream().map(ProjetoProfissional::getUserId).toList();
    if (ids.isEmpty()) return List.of();
    List<Map<String, Object>> body = new ArrayList<>();
    for (Usuario u : usuarios.findAllById(ids)) {
      if (u.isExcluido()) continue;
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("user_id", u.getId());
      item.put("nome", nomeDe(u));
      item.put("email", u.getEmail());
      item.put("perfil", u.getPerfil().name());
      body.add(item);
    }
    body.sort(Comparator.comparing(m -> ((String) m.get("nome")).toLowerCase()));
    return body;
  }

  public record VincularProfissionaisRequest(
      @JsonProperty("profissionais_ids") List<String> profissionaisIds) {}

  /** Substitui a lista de profissionais do projeto pela informada (seleção múltipla da tela). */
  @PutMapping("/{id}/profissionais")
  @Transactional
  public List<Map<String, Object>> definirProfissionais(
      @PathVariable String id, @RequestBody VincularProfissionaisRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    carregar(id);
    definirProfissionais(id, req == null ? List.of() : req.profissionaisIds());
    return profissionais(id);
  }

  @DeleteMapping("/{id}/profissionais/{userId}")
  @Transactional
  public ResponseEntity<Void> desvincularProfissional(
      @PathVariable String id, @PathVariable String userId) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    carregar(id);
    vinculos.deleteByProjetoIdAndUserId(id, userId);
    return ResponseEntity.noContent().build();
  }

  // --------------------------------------------------------- renovar o ciclo

  /**
   * Alunas do projeto com a situação da renovação de cada uma: {@code NAO_ENVIADA},
   * {@code ENVIADA} ou {@code RESPONDIDA}. É o que alimenta a tela de Renovar Ciclo.
   */
  @GetMapping("/{id}/alunas")
  public List<Map<String, Object>> alunas(@PathVariable String id) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    carregar(id);
    List<FichaInscricao> fichas = ciclosService.alunasDoProjeto(id);
    Map<String, CicloAluna> cicloPorAluna = new HashMap<>();
    for (FichaInscricao f : fichas) {
      ciclos
          .findFirstByUserIdAndAbertoTrueOrderByCreatedDesc(f.getUserId())
          .ifPresent(c -> cicloPorAluna.put(f.getUserId(), c));
    }

    List<Map<String, Object>> body = new ArrayList<>();
    for (FichaInscricao f : fichas) {
      CicloAluna ciclo = cicloPorAluna.get(f.getUserId());
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("inscricao_id", f.getId());
      item.put("user_id", f.getUserId());
      item.put("nome_completo", f.getNomeCompleto());
      item.put("nucleo_codigo", f.getTurma());
      item.put("status_inscricao", f.getStatus() == null ? null : f.getStatus().name());
      item.put("acesso_ativo", f.isAcessoAtivo());
      item.put(
          "renovacao_status",
          ciclo == null ? CicloAluna.NAO_ENVIADA : ciclo.getRenovacaoStatus());
      item.put("renovacao_enviada_em", ciclo == null ? null : ciclo.getRenovacaoEnviadaEm());
      body.add(item);
    }
    body.sort(Comparator.comparing(m -> ((String) m.get("nome_completo")).toLowerCase()));
    return body;
  }

  public record RenovarCicloRequest(@JsonProperty("alunas_ids") List<String> alunasIds) {}

  /**
   * Renova o ciclo: dispara uma nova ficha de confirmação para cada aluna selecionada. O acesso
   * delas só volta quando a ficha for respondida.
   */
  @PostMapping("/{id}/renovar-ciclo")
  @Transactional
  public Map<String, Object> renovarCiclo(
      @PathVariable String id, @RequestBody RenovarCicloRequest req) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL);
    Projeto projeto = carregar(id);
    if (req == null || req.alunasIds() == null || req.alunasIds().isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "alunas_obrigatorias", "Selecione ao menos uma aluna.");
    }
    List<String> renovadas = ciclosService.renovarCiclo(projeto, req.alunasIds(), atual);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("renovadas", renovadas.size());
    body.put("alunas_ids", renovadas);
    return body;
  }

  // ------------------------------------------------------------------- apoio

  private Projeto carregar(String id) {
    return repo.findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Projeto não encontrado."));
  }

  private void validar(ProjetoRequest req) {
    if (req.nome() == null || req.nome().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "nome_obrigatorio", "Informe o nome do projeto.");
    }
    if (req.patrocinador() == null
        || req.patrocinador().isBlank()
        || req.capacidadeAlunas() == null
        || req.capacidadeAlunas() < 1
        || req.dataInicio() == null
        || req.dataTermino() == null) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "campos_obrigatorios",
          "Informe patrocinador, quantidade de alunas e período do projeto.");
    }
    if (req.dataTermino().compareTo(req.dataInicio()) < 0) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "periodo_invalido", "O término não pode ser anterior ao início.");
    }
  }

  private void aplicarCampos(Projeto p, ProjetoRequest req) {
    p.setEspacoKids(Boolean.TRUE.equals(req.espacoKids()));
    p.setNome(req.nome().trim());
    p.setPatrocinador(req.patrocinador().trim());
    p.setCapacidadeAlunas(req.capacidadeAlunas());
    p.setDataInicio(req.dataInicio());
    p.setDataTermino(req.dataTermino());
    p.setDescricao(req.descricao());
  }

  private StatusProjeto statusDe(String valor, StatusProjeto padrao) {
    if (valor == null || valor.isBlank()) return padrao;
    StatusProjeto status = StatusProjeto.parse(valor);
    if (status == null) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "status_invalido", "Status de projeto inválido.");
    }
    return status;
  }

  private String gerarCodigo(String nome) {
    String base = nome.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_").replaceAll("(^_|_$)", "");
    if (base.length() < 2) base = "PROJETO";
    if (base.length() > 32) base = base.substring(0, 32);
    String codigo = base;
    int sufixo = 2;
    while (repo.existsByCodigo(codigo)) codigo = base + "_" + (sufixo++);
    return codigo;
  }

  /**
   * Deixa o projeto exatamente com os profissionais informados: remove quem saiu e adiciona quem
   * entrou, ignorando quem já estava (idempotente).
   */
  private void definirProfissionais(String projetoId, List<String> desejados) {
    Set<String> alvo = new LinkedHashSet<>(desejados == null ? List.of() : desejados);
    alvo.removeIf(id -> id == null || id.isBlank());

    for (String id : alvo) {
      Optional<Usuario> u = usuarios.findById(id).filter(x -> !x.isExcluido());
      if (u.isEmpty() || u.get().getPerfil() == Perfil.ALUNA_FF) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "profissional_invalido",
            "Um dos profissionais selecionados não existe ou não pode ser vinculado a um projeto.");
      }
    }

    List<ProjetoProfissional> atuais = vinculos.findByProjetoId(projetoId);
    Set<String> jaVinculados = new LinkedHashSet<>();
    for (ProjetoProfissional v : atuais) {
      if (alvo.contains(v.getUserId())) {
        jaVinculados.add(v.getUserId());
      } else {
        vinculos.delete(v);
      }
    }
    for (String id : alvo) {
      if (jaVinculados.contains(id)) continue;
      ProjetoProfissional v = new ProjetoProfissional();
      v.setProjetoId(projetoId);
      v.setUserId(id);
      vinculos.save(v);
    }
  }

  private static String nomeDe(Usuario u) {
    return u.getNomeSocial() == null || u.getNomeSocial().isBlank() ? u.getName() : u.getNomeSocial();
  }
}
