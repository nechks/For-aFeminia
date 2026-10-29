package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.TipoProfissional;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Component;

/**
 * Regra: dentro de um mesmo núcleo o profissional tem uma única função. Pode atuar em várias
 * turmas do núcleo, mas sempre no mesmo papel; em outro núcleo pode ter outro papel.
 *
 * <p>Usada pelos dois caminhos de vínculo (turma a turma e em lote pelo núcleo), para a regra não
 * divergir entre eles.
 */
@Component
public class FuncaoNoNucleo {

  private static final Map<String, String> ROTULO =
      Map.of(
          TipoProfissional.PROFESSORA_DEFESA_PESSOAL, "Professora de Defesa Pessoal",
          TipoProfissional.AUXILIAR_DEFESA_PESSOAL, "Auxiliar de Defesa Pessoal",
          TipoProfissional.ASSISTENTE_SOCIAL, "Assistente Social",
          TipoProfissional.MEDIADORA_RODA_CONVERSA, "Mediadora de Roda de Conversa",
          TipoProfissional.MONITOR_CRIANCA, "Monitor de Criança");

  private final TurmaEquipeRepository equipe;
  private final TurmaRepository turmas;

  public FuncaoNoNucleo(TurmaEquipeRepository equipe, TurmaRepository turmas) {
    this.equipe = equipe;
    this.turmas = turmas;
  }

  /**
   * Mensagem de recusa quando a pessoa já exerce outra função em alguma turma do núcleo de
   * {@code destino}; {@code null} quando o vínculo pode seguir.
   */
  public String conflito(Usuario alvo, Turma destino, String tipoPretendido) {
    List<TurmaEquipe> ativos = equipe.findByUserIdAndAtivoTrue(alvo.getId());
    for (TurmaEquipe vinculo : ativos) {
      if (vinculo.getTurmaId().equals(destino.getId())) continue;
      if (Objects.equals(vinculo.getTipoProfissional(), tipoPretendido)) continue;
      Turma outra = turmas.findById(vinculo.getTurmaId()).orElse(null);
      if (outra == null || !outra.isAtivo()) continue;
      if (!Objects.equals(outra.getNucleoId(), destino.getNucleoId())) continue;
      return alvo.getName()
          + " já atua neste núcleo como "
          + rotulo(vinculo.getTipoProfissional())
          + " (turma "
          + outra.getNome()
          + "). No mesmo núcleo o profissional tem uma única função.";
    }
    return null;
  }

  /** Nome legível do tipo profissional. */
  public static String rotulo(String tipo) {
    return ROTULO.getOrDefault(tipo, tipo);
  }
}
