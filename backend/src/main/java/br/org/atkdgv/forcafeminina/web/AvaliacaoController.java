package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.AvaliacaoAluna;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.TipoProfissional;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.AvaliacaoAlunaRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AvaliacaoController {

  private final AvaliacaoAlunaRepository avaliacoes;
  private final FichaInscricaoRepository inscricoes;
  private final TurmaRepository turmas;
  private final TurmaEquipeRepository equipe;

  public AvaliacaoController(
      AvaliacaoAlunaRepository avaliacoes,
      FichaInscricaoRepository inscricoes,
      TurmaRepository turmas,
      TurmaEquipeRepository equipe) {
    this.avaliacoes = avaliacoes;
    this.inscricoes = inscricoes;
    this.turmas = turmas;
    this.equipe = equipe;
  }

  /** Somente a Professora de Defesa Pessoal vinculada à turma registra a avaliação. */
  private Turma exigirTurmaDaProfessora(Usuario atual, String turmaId) {
    if (turmaId == null || turmaId.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "turma_obrigatoria", "Selecione uma turma.");
    }
    Turma turma =
        turmas
            .findById(turmaId)
            .filter(Turma::isAtivo)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Turma não encontrada."));
    TurmaEquipe vinculo =
        equipe
            .findByTurmaIdAndUserId(turmaId, atual.getId())
            .filter(TurmaEquipe::isAtivo)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.FORBIDDEN,
                        "sem_vinculo",
                        "Você não tem vínculo ativo com esta turma."));
    if (!TipoProfissional.PROFESSORA_DEFESA_PESSOAL.equals(vinculo.getTipoProfissional())) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "avaliacao_nao_permitida",
          "Somente a Professora de Defesa Pessoal da turma pode registrar avaliações.");
    }
    return turma;
  }

  private static LocalDate data(String valor) {
    try {
      return LocalDate.parse(valor);
    } catch (DateTimeParseException | NullPointerException ex) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "data_invalida",
          "Informe a data da avaliação no formato AAAA-MM-DD.");
    }
  }

  private static double nota(Double valor, String campo) {
    if (valor == null || valor < 0 || valor > 10 || valor.isNaN() || valor.isInfinite()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "nota_invalida", campo + " deve ser um número de 0 a 10.");
    }
    return Math.round(valor * 10d) / 10d;
  }

  @GetMapping("/professor/avaliacoes")
  public Map<String, Object> listarParaProfessora(
      @RequestParam("turma_id") String turmaId,
      @RequestParam("data_avaliacao") String dataAvaliacao) {
    Usuario atual = CurrentUser.require(Perfil.PROFESSOR);
    Turma turma = exigirTurmaDaProfessora(atual, turmaId);
    LocalDate data = data(dataAvaliacao);

    Map<String, AvaliacaoAluna> porAluna = new HashMap<>();
    avaliacoes
        .findByTurmaIdAndDataAvaliacaoOrderByCreatedAsc(turmaId, data)
        .forEach(a -> porAluna.put(a.getUserId(), a));

    List<Map<String, Object>> alunas = new ArrayList<>();
    for (FichaInscricao ficha :
        inscricoes.findByTurmaIdAndStatusOrderByNomeCompletoAsc(
            turmaId, StatusInscricao.APROVADA)) {
      if (ficha.getUserId() == null) continue;
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("user_id", ficha.getUserId());
      item.put("nome_completo", ficha.getNomeCompleto());
      item.put("avaliacao", porAluna.get(ficha.getUserId()));
      alunas.add(item);
    }
    return Map.of(
        "turma_id", turma.getId(),
        "turma_nome", turma.getNome(),
        "data_avaliacao", data,
        "alunas", alunas);
  }

  /** A nota é da aluna; a professora só transcreve o valor que ela informou na aula. */
  public record NotaDaAluna(
      @JsonProperty("user_id") String userId,
      @JsonProperty("nota_autoavaliacao") Double notaAutoavaliacao,
      @JsonProperty("feedback_professora") String feedbackProfessora) {}

  public record RegistrarAvaliacoes(
      @JsonProperty("turma_id") String turmaId,
      @JsonProperty("data_avaliacao") String dataAvaliacao,
      List<NotaDaAluna> avaliacoes) {}

  @PostMapping("/professor/avaliacoes")
  @Transactional
  public Map<String, Object> registrar(@RequestBody RegistrarAvaliacoes req) {
    Usuario atual = CurrentUser.require(Perfil.PROFESSOR);
    if (req == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "requisicao_invalida", "Informe as avaliações.");
    }
    Turma turma = exigirTurmaDaProfessora(atual, req.turmaId());
    LocalDate data = data(req.dataAvaliacao());
    if (req.avaliacoes() == null || req.avaliacoes().isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "avaliacoes_obrigatorias", "Avalie ao menos uma aluna.");
    }

    Set<String> alocadas = new HashSet<>();
    inscricoes
        .findByTurmaIdAndStatusOrderByNomeCompletoAsc(turma.getId(), StatusInscricao.APROVADA)
        .forEach(f -> {
          if (f.getUserId() != null) alocadas.add(f.getUserId());
        });

    // Valida o lote inteiro antes de alterar qualquer registro.
    for (NotaDaAluna item : req.avaliacoes()) {
      if (item.userId() == null || !alocadas.contains(item.userId())) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "aluna_fora_da_turma",
            "Uma das alunas não está aprovada e alocada nesta turma.");
      }
      nota(item.notaAutoavaliacao(), "A nota da autoavaliação");
    }

    int total = 0;
    for (NotaDaAluna item : req.avaliacoes()) {
      AvaliacaoAluna avaliacao =
          avaliacoes
              .findByUserIdAndTurmaIdAndDataAvaliacao(item.userId(), turma.getId(), data)
              .orElseGet(AvaliacaoAluna::new);
      avaliacao.setUserId(item.userId());
      avaliacao.setTurmaId(turma.getId());
      avaliacao.setDataAvaliacao(data);
      avaliacao.setNotaAutoavaliacao(nota(item.notaAutoavaliacao(), "A nota da autoavaliação"));
      avaliacao.setFeedbackProfessora(
          item.feedbackProfessora() == null ? "" : item.feedbackProfessora().trim());
      avaliacao.setRegistradoPor(atual.getId());
      avaliacoes.save(avaliacao);
      total++;
    }
    return Map.of("success", true, "total", total);
  }

  @GetMapping("/avaliacoes/minhas")
  public List<AvaliacaoAluna> minhas() {
    Usuario atual = CurrentUser.require(Perfil.ALUNA_FF);
    return avaliacoes.findByUserIdOrderByDataAvaliacaoDesc(atual.getId());
  }

  public record ReflexaoRequest(@JsonProperty("reflexao_aluna") String reflexaoAluna) {}

  /**
   * A nota já é da aluna e chega pelo registro da professora; aqui ela só acrescenta a reflexão
   * escrita sobre a própria evolução.
   */
  @PatchMapping("/avaliacoes/{id}/reflexao")
  @Transactional
  public AvaliacaoAluna registrarReflexao(
      @PathVariable String id, @RequestBody ReflexaoRequest req) {
    Usuario atual = CurrentUser.require(Perfil.ALUNA_FF);
    AvaliacaoAluna avaliacao =
        avaliacoes
            .findById(id)
            .filter(a -> atual.getId().equals(a.getUserId()))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "not_found", "Avaliação não encontrada."));
    if (req == null || req.reflexaoAluna() == null || req.reflexaoAluna().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "reflexao_obrigatoria", "Escreva sua reflexão antes de salvar.");
    }
    avaliacao.setReflexaoAluna(req.reflexaoAluna().trim());
    return avaliacoes.save(avaliacao);
  }
}
