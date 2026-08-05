package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Mural;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.CalendarioAulaRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.MuralRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import java.time.LocalDate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {

  private final FichaInscricaoRepository inscricoes;
  private final FichaConfirmacaoRepository confirmacoes;
  private final CalendarioAulaRepository calendario;
  private final PresencaRepository presencas;
  private final MuralRepository mural;
  private final UsuarioRepository usuarios;
  private final TurmaRepository turmas;
  private final NucleoRepository nucleos;
  private final ObjectMapper objectMapper;

  public DashboardController(
      FichaInscricaoRepository inscricoes,
      FichaConfirmacaoRepository confirmacoes,
      CalendarioAulaRepository calendario,
      PresencaRepository presencas,
      MuralRepository mural,
      UsuarioRepository usuarios,
      TurmaRepository turmas,
      NucleoRepository nucleos,
      ObjectMapper objectMapper) {
    this.inscricoes = inscricoes;
    this.confirmacoes = confirmacoes;
    this.calendario = calendario;
    this.presencas = presencas;
    this.mural = mural;
    this.usuarios = usuarios;
    this.turmas = turmas;
    this.nucleos = nucleos;
    this.objectMapper = objectMapper;
  }

  /** Dashboard da aluna: frequência, total de aulas da turma e avisos do mural. */
  @GetMapping("/dashboard/forca-feminina")
  public Map<String, Object> dashboardAluna() {
    Usuario atual = CurrentUser.require(Perfil.ALUNA_FF);

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("nome", atual.getName());

    FichaInscricao inscricao =
        inscricoes
            .findFirstByUserIdAndStatus(atual.getId(), StatusInscricao.APROVADA)
            .orElse(null);

    if (inscricao == null) {
      body.put("turma", "");
      body.put("totalAulas", 0);
      body.put("aulasAssistidas", 0);
      body.put("percentualFrequencia", 0);
      body.put("avisos", List.of());
      return body;
    }

    String turma = inscricao.getTurma() == null ? "" : inscricao.getTurma();
    long totalAulas = calendario.countByTurma(turma);
    // Cada chamada vale meia aula: presença na Defesa Pessoal e na Roda de Conversa do mesmo dia
    // completa uma aula. Só uma das duas conta 0,5.
    double aulasAssistidas = presencas.countByUserIdAndPresenteTrue(atual.getId()) * 0.5;
    double percentual =
        totalAulas > 0 ? Math.round((aulasAssistidas * 1000.0) / totalAulas) / 10.0 : 0;

    // Aviso com data passada some do painel (fica salvo na aba Mural), como nos eventos.
    List<Mural> avisos = mural.findAtivosParaTurma(LocalDate.now().toString(), turma);
    if (avisos.size() > 5) avisos = avisos.subList(0, 5);

    body.put("turma", turma);
    body.put("totalAulas", totalAulas);
    body.put("aulasAssistidas", aulasAssistidas);
    body.put("percentualFrequencia", percentual);
    body.put("avisos", avisos);
    return body;
  }

  /**
   * Faltas por turma, para o acompanhamento por gráfico no painel. Cada chamada vale meia aula,
   * então presenças e faltas vêm convertidas em aulas.
   */
  @GetMapping("/indicadores/turmas")
  public List<Map<String, Object>> indicadoresPorTurma() {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);

    Map<String, String> nomeNucleo = new HashMap<>();
    nucleos.findAll().forEach(n -> nomeNucleo.put(n.getId(), n.getNome()));

    List<Map<String, Object>> body = new java.util.ArrayList<>();
    for (Turma t : turmas.findAll()) {
      if (!t.isAtivo()) continue;
      List<Presenca> registros = presencas.findByTurmaId(t.getId());
      double presentes = registros.stream().filter(Presenca::isPresente).count() * 0.5;
      double justificadas =
          registros.stream().filter(p -> !p.isPresente() && p.isJustificada()).count() * 0.5;
      double semJustificativa =
          registros.stream().filter(p -> !p.isPresente() && !p.isJustificada()).count() * 0.5;
      long alunas =
          inscricoes
              .findByTurmaIdAndStatusOrderByNomeCompletoAsc(t.getId(), StatusInscricao.APROVADA)
              .size();

      Map<String, Object> item = new LinkedHashMap<>();
      item.put("turma_id", t.getId());
      item.put("turma_nome", t.getNome());
      item.put("turno", t.getTurno());
      item.put("dias_semana", t.getDiasSemana());
      item.put("nucleo_id", t.getNucleoId());
      item.put("nucleo_nome", nomeNucleo.getOrDefault(t.getNucleoId(), ""));
      item.put("alunas", alunas);
      item.put("presencas", presentes);
      item.put("faltas_justificadas", justificadas);
      item.put("faltas_sem_justificativa", semJustificativa);
      body.add(item);
    }
    body.sort(
        java.util.Comparator.comparing((Map<String, Object> m) -> (String) m.get("nucleo_nome"))
            .thenComparing(m -> (String) m.get("turma_nome")));
    return body;
  }

  /** Indicadores da Gestão Geral, compartilhados com o Administrativo. */
  @GetMapping("/indicadores/dashboard")
  public Map<String, Object> indicadores() {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);

    // Usuárias excluídas logicamente não entram nas contagens (regra 4.1 do escopo)
    java.util.Set<String> excluidas = new java.util.HashSet<>();
    usuarios.findAll().forEach(u -> { if (u.isExcluido()) excluidas.add(u.getId()); });

    List<FichaInscricao> todas =
        inscricoes.findAll().stream()
            .filter(f -> f.getUserId() == null || !excluidas.contains(f.getUserId()))
            .toList();

    // Inscrições em lista de espera não contam no total de inscrições (regra 4.2)
    long totalInscricoes =
        todas.stream().filter(f -> f.getStatus() != StatusInscricao.LISTA_ESPERA).count();
    long aprovadas = todas.stream().filter(f -> f.getStatus() == StatusInscricao.APROVADA).count();
    long aguardando =
        todas.stream()
            .filter(
                f ->
                    f.getStatus() == StatusInscricao.AGUARDANDO
                        || f.getStatus() == StatusInscricao.EM_ANALISE)
            .count();
    long listaEspera =
        todas.stream().filter(f -> f.getStatus() == StatusInscricao.LISTA_ESPERA).count();
    long canceladas =
        todas.stream().filter(f -> f.getStatus() == StatusInscricao.CANCELADA).count();
    double dropoutRate =
        totalInscricoes > 0 ? Math.round((canceladas * 1000.0) / totalInscricoes) / 10.0 : 0;

    Map<String, Integer> statusDist = new HashMap<>();
    Map<String, Integer> turmaDist = new HashMap<>();
    for (FichaInscricao f : todas) {
      if (f.getStatus() != null) statusDist.merge(f.getStatus().name(), 1, Integer::sum);
      if (f.getStatus() == StatusInscricao.APROVADA
          && f.getTurma() != null
          && !f.getTurma().isBlank()) {
        turmaDist.merge(f.getTurma(), 1, Integer::sum);
      }
    }

    Map<String, Integer> rendaDist = new HashMap<>();
    Map<String, Integer> moradiaDist = new HashMap<>();
    for (FichaConfirmacao conf : confirmacoes.findAll()) {
      String secao6 = conf.getSecao6Socioeconomico();
      if (secao6 == null || secao6.isBlank()) continue;
      try {
        JsonNode node = objectMapper.readTree(secao6);
        JsonNode renda = node.get("renda_familiar");
        if (renda != null && renda.isTextual()) rendaDist.merge(renda.asText(), 1, Integer::sum);
        JsonNode moradia = node.get("tipo_moradia");
        if (moradia != null && moradia.isTextual()) {
          moradiaDist.merge(moradia.asText(), 1, Integer::sum);
        }
      } catch (Exception ignored) {
        // seção com JSON inválido não entra na distribuição
      }
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("totalStudents", aprovadas);
    body.put("totalInscricoes", totalInscricoes);
    body.put("aguardandoAprovacao", aguardando);
    body.put("listaEspera", listaEspera);
    body.put("dropoutRate", dropoutRate);
    body.put("canceladas", canceladas);
    body.put("statusDistribution", statusDist);
    body.put("turmaDistribution", turmaDist);
    body.put(
        "socioeconomicDistribution",
        Map.of("rendaFamiliar", rendaDist, "tipoMoradia", moradiaDist));
    return body;
  }
}
