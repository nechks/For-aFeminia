package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.TipoChamada;
import br.org.atkdgv.forcafeminina.domain.TipoProfissional;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.service.AlertaService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PresencaController {

  private final PresencaRepository presencas;
  private final FichaInscricaoRepository inscricoes;
  private final UsuarioRepository usuarios;
  private final TurmaRepository turmasRepo;
  private final NucleoRepository nucleos;
  private final TurmaEquipeRepository equipe;
  private final AlertaService alertaService;

  public PresencaController(
      PresencaRepository presencas,
      FichaInscricaoRepository inscricoes,
      UsuarioRepository usuarios,
      TurmaRepository turmasRepo,
      NucleoRepository nucleos,
      TurmaEquipeRepository equipe,
      AlertaService alertaService) {
    this.presencas = presencas;
    this.inscricoes = inscricoes;
    this.usuarios = usuarios;
    this.turmasRepo = turmasRepo;
    this.nucleos = nucleos;
    this.equipe = equipe;
    this.alertaService = alertaService;
  }

  /**
   * Regra 8.1 do escopo, agora por turma: a pessoa só acessa a chamada das turmas em que tem
   * vínculo ativo, e o tipo do vínculo precisa permitir chamada (Monitor de Criança não faz). A
   * validação é feita sempre no backend, mesmo que o frontend esconda as opções.
   */
  private Turma enforceTurma(Usuario atual, String turmaId, String tipoChamada) {
    if (turmaId == null || turmaId.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "turma_id é obrigatório.");
    }
    Turma turma =
        turmasRepo
            .findById(turmaId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Turma não encontrada."));
    if (atual.getPerfil() == Perfil.ADMINISTRATIVO || atual.getPerfil() == Perfil.GESTAO_GERAL) {
      return turma;
    }
    TurmaEquipe vinculo =
        equipe
            .findByTurmaIdAndUserId(turmaId, atual.getId())
            .filter(TurmaEquipe::isAtivo)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.FORBIDDEN,
                        "sem_vinculo",
                        "Você não tem vínculo com esta turma."));
    // Cada profissional só acessa a chamada da própria função.
    if (!TipoProfissional.podeFazerChamada(vinculo.getTipoProfissional(), tipoChamada)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "chamada_nao_permitida",
          "Sua função nesta turma não faz a chamada de "
              + (TipoChamada.RODA_CONVERSA.equals(tipoChamada) ? "Roda de Conversa" : "Defesa Pessoal")
              + ".");
    }
    return turma;
  }

  private String enforceTipoChamada(String tipoChamada) {
    if (!TipoChamada.valido(tipoChamada)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "tipo_chamada_invalido",
          "Informe tipo_chamada como RODA_CONVERSA ou DEFESA_PESSOAL.");
    }
    return tipoChamada;
  }

  @GetMapping("/professor/presenca")
  public Map<String, Object> listarChamada(
      @RequestParam("turma_id") String turmaId,
      @RequestParam("data_aula") String dataAula,
      @RequestParam("tipo_chamada") String tipoChamada) {
    Usuario atual =
        CurrentUser.require(
            Perfil.PROFESSOR, Perfil.ASSISTENTE_SOCIAL, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    enforceTipoChamada(tipoChamada);
    Turma turma = enforceTurma(atual, turmaId, tipoChamada);
    if (dataAula == null || dataAula.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "data_aula é obrigatório.");
    }

    List<FichaInscricao> aprovadas =
        inscricoes.findByTurmaIdAndStatusOrderByNomeCompletoAsc(
            turma.getId(), StatusInscricao.APROVADA);

    List<Map<String, Object>> alunos = new ArrayList<>();
    for (FichaInscricao insc : aprovadas) {
      Map<String, Object> aluno = new LinkedHashMap<>();
      aluno.put("inscricao_id", insc.getId());
      aluno.put("user_id", insc.getUserId());
      aluno.put("nome_completo", insc.getNomeCompleto());
      aluno.put("turma", insc.getTurma());
      aluno.put("turma_id", turma.getId());

      Map<String, Object> presencaInfo = null;
      if (insc.getUserId() != null) {
        Presenca p =
            presencas
                .findByUserIdAndTurmaIdAndDataAulaAndTipoChamada(
                    insc.getUserId(), turma.getId(), dataAula, tipoChamada)
                .orElse(null);
        if (p != null) {
          presencaInfo =
              Map.of(
                  "id", p.getId(),
                  "presente", p.isPresente(),
                  "justificada", p.isJustificada(),
                  "justificativa", p.getJustificativa() == null ? "" : p.getJustificativa());
        }
      }
      aluno.put("presenca", presencaInfo);
      alunos.add(aluno);
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("turma_id", turma.getId());
    body.put("turma_nome", turma.getNome());
    body.put("tipo_chamada", tipoChamada);
    body.put("data_aula", dataAula);
    body.put("alunos", alunos);
    return body;
  }

  public record RegistroPresenca(
      @JsonProperty("user_id") String userId,
      boolean presente,
      boolean justificada,
      String justificativa) {}

  public record RegistrarRequest(
      @JsonProperty("data_aula") String dataAula,
      @JsonProperty("turma_id") String turmaId,
      @JsonProperty("tipo_chamada") String tipoChamada,
      List<RegistroPresenca> registros) {}

  @PostMapping("/professor/presenca")
  public Map<String, Object> registrar(@RequestBody RegistrarRequest req) {
    Usuario atual =
        CurrentUser.require(
            Perfil.PROFESSOR, Perfil.ASSISTENTE_SOCIAL, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    String tipoChamada = enforceTipoChamada(req.tipoChamada());
    Turma turma = enforceTurma(atual, req.turmaId(), tipoChamada);
    if (req.dataAula() == null || req.dataAula().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "data_aula é obrigatório.");
    }
    if (req.registros() == null || req.registros().isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "bad_request",
          "registros é obrigatório e deve ser um array não vazio.");
    }

    String codigoNucleo =
        nucleos.findById(turma.getNucleoId()).map(Nucleo::getCodigo).orElse(null);

    // Só entram alunas realmente alocadas nesta turma, mesmo que o payload traga outras.
    Set<String> alocadas = new HashSet<>();
    inscricoes
        .findByTurmaIdAndStatusOrderByNomeCompletoAsc(turma.getId(), StatusInscricao.APROVADA)
        .forEach(f -> alocadas.add(f.getUserId()));

    List<Map<String, Object>> results = new ArrayList<>();
    for (RegistroPresenca reg : req.registros()) {
      if (reg.userId() == null || reg.userId().isBlank()) continue;
      if (!alocadas.contains(reg.userId())) continue;

      Presenca p =
          presencas
              .findByUserIdAndTurmaIdAndDataAulaAndTipoChamada(
                  reg.userId(), turma.getId(), req.dataAula(), tipoChamada)
              .orElseGet(Presenca::new);
      boolean nova = p.getId() == null;
      p.setUserId(reg.userId());
      p.setDataAula(req.dataAula());
      p.setTurmaId(turma.getId());
      p.setTipoChamada(tipoChamada);
      p.setPresente(reg.presente());
      p.setJustificada(reg.justificada());
      p.setJustificativa(reg.justificativa() == null ? "" : reg.justificativa());
      if (codigoNucleo != null && !codigoNucleo.isBlank()) p.setTurma(codigoNucleo);
      p.setRegistradoPor(atual.getId());
      presencas.save(p);
      results.add(Map.of("user_id", reg.userId(), nova ? "created" : "updated", true));

      // Falta sem justificativa pode disparar alerta para a Assistente Social (regra 6)
      if (!reg.presente()) {
        alertaService.verificarFaltasSemJustificativa(reg.userId());
      }
    }

    return Map.of("success", true, "total", results.size(), "results", results);
  }

  @GetMapping("/presencas/minhas")
  public List<Presenca> minhas() {
    Usuario atual = CurrentUser.get();
    return presencas.findByUserIdOrderByDataAulaDesc(atual.getId());
  }

  @GetMapping("/presencas")
  public List<Presenca> listAll() {
    CurrentUser.require(Perfil.PROFESSOR, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    return presencas.findAllByOrderByDataAulaDesc();
  }

  /**
   * Lista detalhada de presenças ou faltas para os cards do painel de gestão: nome da aluna,
   * núcleo, data, professor responsável e justificativa.
   */
  @GetMapping("/presencas/detalhes")
  public List<Map<String, Object>> detalhes(@RequestParam boolean presente) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL, Perfil.ASSISTENTE_SOCIAL);

    List<Presenca> registros =
        presencas.findAllByOrderByDataAulaDesc().stream()
            .filter(p -> p.isPresente() == presente)
            .toList();

    Set<String> userIds = new HashSet<>();
    for (Presenca p : registros) {
      userIds.add(p.getUserId());
      if (p.getRegistradoPor() != null) userIds.add(p.getRegistradoPor());
    }
    Map<String, Usuario> porId = new HashMap<>();
    usuarios.findAllById(userIds).forEach(u -> porId.put(u.getId(), u));

    Map<String, String> turmaPorAluna = new HashMap<>();
    List<Map<String, Object>> body = new ArrayList<>();
    for (Presenca p : registros) {
      Usuario aluna = porId.get(p.getUserId());
      String turma = p.getTurma();
      if (turma == null || turma.isBlank()) {
        turma =
            turmaPorAluna.computeIfAbsent(
                p.getUserId(),
                id ->
                    inscricoes
                        .findFirstByUserIdOrderByCreatedDesc(id)
                        .map(f -> f.getTurma() == null ? "" : f.getTurma())
                        .orElse(""));
      }
      Usuario professor = p.getRegistradoPor() == null ? null : porId.get(p.getRegistradoPor());

      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", p.getId());
      item.put("user_id", p.getUserId());
      item.put("aluna_nome", aluna != null ? aluna.getName() : "—");
      item.put("turma", turma);
      item.put("data_aula", p.getDataAula());
      item.put("presente", p.isPresente());
      item.put("justificativa", p.getJustificativa() == null ? "" : p.getJustificativa());
      item.put("professor_nome", professor != null ? professor.getName() : "");
      body.add(item);
    }
    return body;
  }
}
