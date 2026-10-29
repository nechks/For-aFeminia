package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.Alerta;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.repo.AlertaRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AlertaService {

  public static final String TIPO_FALTAS = "FALTAS_SEM_JUSTIFICATIVA";
  private static final int LIMITE_FALTAS = 0;

  private final AlertaRepository alertas;
  private final PresencaRepository presencas;
  private final UsuarioRepository usuarios;
  private final FichaInscricaoRepository inscricoes;

  public AlertaService(
      AlertaRepository alertas,
      PresencaRepository presencas,
      UsuarioRepository usuarios,
      FichaInscricaoRepository inscricoes) {
    this.alertas = alertas;
    this.presencas = presencas;
    this.usuarios = usuarios;
    this.inscricoes = inscricoes;
  }

  /**
   * Qualquer falta sem justificativa — em qualquer uma das duas chamadas do dia — gera alerta
   * progressivo para a equipe. Alertas abertos são atualizados em vez de duplicados.
   */
  public void verificarFaltasSemJustificativa(String alunaId) {
    // Qualquer falta sem justificativa já abre o alerta (LIMITE_FALTAS = 0), inclusive quando a
    // aluna perde só uma das duas chamadas do dia — que vale 0,5. As duas somam uma falta completa.
    // Faltas já tratadas num alerta resolvido não voltam a contar: só entram as registradas ou
    // alteradas depois da última resolução.
    Instant corte =
        alertas
            .findFirstByAlunaIdAndTipoAndStatusOrderByUpdatedDesc(alunaId, TIPO_FALTAS, "RESOLVIDO")
            .map(Alerta::getUpdated)
            .orElse(null);
    List<Presenca> registros =
        presencas.findByUserIdOrderByDataAulaDesc(alunaId).stream()
            .filter(p -> !p.isPresente())
            .filter(p -> !p.isJustificada())
            .filter(p -> corte == null || (p.getUpdated() != null && p.getUpdated().isAfter(corte)))
            .toList();
    double faltas = registros.size() * 0.5;

    String datas =
        registros.stream().map(Presenca::getDataAula).distinct().sorted().collect(Collectors.joining(","));

    Alerta aberto =
        alertas.findByAlunaIdAndTipoAndStatus(alunaId, TIPO_FALTAS, "ABERTO").orElse(null);
    if (aberto != null) {
      // Atualiza também para baixo: uma falta corrigida ou justificada sai da contagem.
      aberto.setFaltasSemJustificativa(faltas);
      aberto.setDatas(datas);
      alertas.save(aberto);
      return;
    }

    if (faltas <= LIMITE_FALTAS) return;

    Alerta alerta = new Alerta();
    alerta.setAlunaId(alunaId);
    alerta.setAlunaNome(
        usuarios
            .findById(alunaId)
            .map(u -> u.getNomeSocial() != null && !u.getNomeSocial().isBlank() ? u.getNomeSocial() : u.getName())
            .orElse("Aluna"));
    alerta.setTurma(
        inscricoes
            .findFirstByUserIdOrderByCreatedDesc(alunaId)
            .map(f -> f.getTurma() == null ? "" : f.getTurma())
            .orElse(""));
    alerta.setTipo(TIPO_FALTAS);
    alerta.setFaltasSemJustificativa(faltas);
    alerta.setDatas(datas);
    alerta.setStatus("ABERTO");
    alertas.save(alerta);
  }
}
