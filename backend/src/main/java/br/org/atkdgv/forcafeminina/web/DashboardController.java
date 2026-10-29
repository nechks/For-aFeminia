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

    // A data da aula inaugural é definida na inscrição, não na tabela do calendário. As duas
    // fontes precisam viajar juntas para o painel e para a página Calendário mostrarem o que a
    // gestão realmente salvou.
    Turma turmaConcreta =
        inscricao.getTurmaId() == null ? null : turmas.findById(inscricao.getTurmaId()).orElse(null);
    br.org.atkdgv.forcafeminina.domain.Nucleo nucleo =
        turmaConcreta != null
            ? nucleos.findById(turmaConcreta.getNucleoId()).orElse(null)
            : nucleos.findByCodigo(turma).orElse(null);
    String horarioInicio =
        turmaConcreta != null ? turmaConcreta.getHorarioInicio() : nucleo == null ? null : nucleo.getHorarioInicio();
    String horarioFim =
        turmaConcreta != null ? turmaConcreta.getHorarioFim() : nucleo == null ? null : nucleo.getHorarioFim();
    String localAula =
        nucleo == null
            ? null
            : java.util.stream.Stream.of(nucleo.getEndereco(), nucleo.getBairro(), nucleo.getCidade())
                .filter(v -> v != null && !v.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
    // Cada chamada vale meia aula: presença na Defesa Pessoal e na Roda de Conversa do mesmo dia
    // completa uma aula. Só uma das duas conta 0,5.
    double aulasAssistidas = presencas.countByUserIdAndPresenteTrue(atual.getId()) * 0.5;
    double percentual =
        totalAulas > 0 ? Math.round((aulasAssistidas * 1000.0) / totalAulas) / 10.0 : 0;

    // Aviso com data passada some do painel (fica salvo na aba Mural), como nos eventos.
    List<Mural> avisos = mural.findAtivosParaTurma(LocalDate.now().toString(), turma);
    if (avisos.size() > 5) avisos = avisos.subList(0, 5);

    body.put("turma", turma);
    body.put("dataPrimeiraAula", inscricao.getDataPrimeiraAula());
    body.put("horarioInicio", horarioInicio);
    body.put("horarioFim", horarioFim);
    body.put("localAula", localAula);
    body.put(
        "totalAulas",
        totalAulas
            + (inscricao.getDataPrimeiraAula() != null
                    && !inscricao.getDataPrimeiraAula().isBlank()
                    && calendario.findByTurmaOrderByDataAulaAsc(turma).stream()
                        .noneMatch(a -> inscricao.getDataPrimeiraAula().equals(a.getDataAula()))
                ? 1
                : 0));
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

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("totalStudents", aprovadas);
    body.put("totalInscricoes", totalInscricoes);
    body.put("aguardandoAprovacao", aguardando);
    body.put("listaEspera", listaEspera);
    body.put("dropoutRate", dropoutRate);
    body.put("canceladas", canceladas);
    body.put("statusDistribution", statusDist);
    body.put("turmaDistribution", turmaDist);
    body.put("socioeconomicDistribution", distribuicaoSocioeconomica());
    return body;
  }

  /**
   * Só os gráficos do perfil socioeconômico, para a Assistente Social. São contagens agregadas,
   * sem nome de aluna; o restante dos indicadores segue restrito à Gestão e ao Administrativo.
   */
  @GetMapping("/indicadores/socioeconomico")
  public Map<String, Object> socioeconomico() {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL);
    return distribuicaoSocioeconomica();
  }

  /**
   * Faixa de renda per capita e tipo de moradia das fichas de confirmação. A faixa de renda é
   * respondida em "Dados profissionais" (seção 3); o tipo de moradia, no perfil socioeconômico
   * (seção 6). Ler a renda na seção 6 deixava o gráfico sempre vazio.
   */
  private Map<String, Object> distribuicaoSocioeconomica() {
    Map<String, Integer> rendaDist = new HashMap<>();
    Map<String, Integer> moradiaDist = new HashMap<>();
    for (FichaConfirmacao conf : confirmacoes.findAll()) {
      JsonNode secao3 = lerJson(conf.getSecao3Dados());
      JsonNode secao6 = lerJson(conf.getSecao6Socioeconomico());
      // A seção 6 fica como reserva, caso alguma ficha antiga tenha gravado a renda lá.
      String renda = textoDe(secao3, "renda_familiar");
      if (renda == null) renda = textoDe(secao6, "renda_familiar");
      if (renda != null) rendaDist.merge(renda, 1, Integer::sum);
      String moradia = textoDe(secao6, "tipo_moradia");
      if (moradia != null) moradiaDist.merge(moradia, 1, Integer::sum);
    }
    return Map.of("rendaFamiliar", rendaDist, "tipoMoradia", moradiaDist);
  }

  /** JSON de uma seção da ficha; seção vazia ou inválida não entra na distribuição. */
  private JsonNode lerJson(String json) {
    if (json == null || json.isBlank()) return null;
    try {
      return objectMapper.readTree(json);
    } catch (Exception e) {
      return null;
    }
  }

  private static String textoDe(JsonNode no, String campo) {
    if (no == null) return null;
    JsonNode valor = no.get(campo);
    if (valor == null || !valor.isTextual() || valor.asText().isBlank()) return null;
    return valor.asText().trim();
  }
}
