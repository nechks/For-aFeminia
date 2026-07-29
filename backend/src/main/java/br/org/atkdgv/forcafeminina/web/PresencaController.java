package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
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
  private final AlertaService alertaService;

  public PresencaController(
      PresencaRepository presencas,
      FichaInscricaoRepository inscricoes,
      UsuarioRepository usuarios,
      AlertaService alertaService) {
    this.presencas = presencas;
    this.inscricoes = inscricoes;
    this.usuarios = usuarios;
    this.alertaService = alertaService;
  }

  /**
   * Regra 8.1 do escopo: professor(a) só acessa a chamada do próprio núcleo. A validação é feita
   * sempre no backend, mesmo que o frontend esconda opções.
   */
  private String enforceNucleo(Usuario atual, String turmaSolicitada) {
    if (atual.getPerfil() != Perfil.PROFESSOR) return turmaSolicitada;
    if ("MONITOR_CRIANCA".equals(atual.getTipoProfissional())) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "chamada_nao_permitida",
          "Monitor de Criança não possui permissão para realizar chamadas.");
    }
    String nucleo = atual.getTurma();
    if (nucleo == null || nucleo.isBlank()) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "sem_nucleo",
          "Seu perfil de professor(a) não tem núcleo definido. Contate o administrativo.");
    }
    if (turmaSolicitada != null && !turmaSolicitada.isBlank() && !nucleo.equals(turmaSolicitada)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "nucleo_invalido",
          "Você só pode registrar e consultar a chamada do seu núcleo.");
    }
    return nucleo;
  }

  @GetMapping("/professor/presenca")
  public Map<String, Object> listarChamada(
      @RequestParam String turma, @RequestParam String dataAula) {
    Usuario atual =
        CurrentUser.require(Perfil.PROFESSOR, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    turma = enforceNucleo(atual, turma);
    if (turma.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "turma é obrigatório.");
    }
    if (dataAula.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "dataAula é obrigatório.");
    }

    List<FichaInscricao> aprovadas =
        inscricoes.findByTurmaAndStatusOrderByNomeCompletoAsc(turma, StatusInscricao.APROVADA);

    List<Map<String, Object>> alunos = new ArrayList<>();
    for (FichaInscricao insc : aprovadas) {
      Map<String, Object> aluno = new LinkedHashMap<>();
      aluno.put("inscricao_id", insc.getId());
      aluno.put("user_id", insc.getUserId());
      aluno.put("nome_completo", insc.getNomeCompleto());
      aluno.put("turma", turma);

      Map<String, Object> presencaInfo = null;
      if (insc.getUserId() != null) {
        Presenca p = presencas.findByUserIdAndDataAula(insc.getUserId(), dataAula).orElse(null);
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
    body.put("turma", turma);
    body.put("dataAula", dataAula);
    body.put("alunos", alunos);
    return body;
  }

  public record RegistroPresenca(
      @JsonProperty("user_id") String userId,
      boolean presente,
      boolean justificada,
      String justificativa) {}

  public record RegistrarRequest(String dataAula, String turma, List<RegistroPresenca> registros) {}

  @PostMapping("/professor/presenca")
  public Map<String, Object> registrar(@RequestBody RegistrarRequest req) {
    Usuario atual =
        CurrentUser.require(Perfil.PROFESSOR, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    String turma = enforceNucleo(atual, req.turma());
    if (req.dataAula() == null || req.dataAula().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "dataAula é obrigatório.");
    }
    if (req.registros() == null || req.registros().isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "bad_request",
          "registros é obrigatório e deve ser um array não vazio.");
    }

    List<Map<String, Object>> results = new ArrayList<>();
    for (RegistroPresenca reg : req.registros()) {
      if (reg.userId() == null || reg.userId().isBlank()) continue;

      // Professora só registra alunas do próprio núcleo, mesmo que o payload traga outras
      if (atual.getPerfil() == Perfil.PROFESSOR) {
        String turmaAluna =
            inscricoes
                .findFirstByUserIdOrderByCreatedDesc(reg.userId())
                .map(FichaInscricao::getTurma)
                .orElse("");
        if (!turma.equals(turmaAluna)) continue;
      }

      Presenca p =
          presencas.findByUserIdAndDataAula(reg.userId(), req.dataAula()).orElseGet(Presenca::new);
      boolean nova = p.getId() == null;
      p.setUserId(reg.userId());
      p.setDataAula(req.dataAula());
      p.setPresente(reg.presente());
      p.setJustificada(reg.justificada());
      p.setJustificativa(reg.justificativa() == null ? "" : reg.justificativa());
      if (turma != null && !turma.isBlank()) p.setTurma(turma);
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
