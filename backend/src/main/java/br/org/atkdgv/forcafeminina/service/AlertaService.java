package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.Alerta;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.repo.AlertaRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
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
   * A partir da primeira falta sem justificativa, gera alerta progressivo para a equipe. Alertas abertos são atualizados em vez de
   * duplicados.
   */
  public void verificarFaltasSemJustificativa(String alunaId) {
    List<Presenca> faltas =
        presencas.findByUserIdOrderByDataAulaDesc(alunaId).stream()
            .filter(p -> !p.isPresente())
            .filter(p -> !p.isJustificada())
            .toList();

    if (faltas.size() <= LIMITE_FALTAS) return;

    String datas =
        faltas.stream().map(Presenca::getDataAula).sorted().collect(Collectors.joining(","));

    Alerta aberto =
        alertas.findByAlunaIdAndTipoAndStatus(alunaId, TIPO_FALTAS, "ABERTO").orElse(null);
    if (aberto != null) {
      aberto.setFaltasSemJustificativa(faltas.size());
      aberto.setDatas(datas);
      alertas.save(aberto);
      return;
    }

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
    alerta.setFaltasSemJustificativa(faltas.size());
    alerta.setDatas(datas);
    alerta.setStatus("ABERTO");
    alertas.save(alerta);
  }
}
