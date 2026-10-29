package br.org.atkdgv.forcafeminina.domain;

import java.util.List;
import java.util.Map;

/**
 * Tipos de profissional que podem ser vinculados a uma turma. O tipo é escolhido no momento do
 * vínculo (não no cadastro da pessoa), porque a mesma pessoa pode ter papéis diferentes em turmas
 * diferentes.
 *
 * <p>Cada profissional acessa apenas a chamada da própria função: a Professora de Defesa Pessoal
 * faz a chamada de Defesa Pessoal e a Mediadora faz a da Roda de Conversa. Auxiliar de Defesa
 * Pessoal, Monitor de Criança e Assistente Social não fazem chamada.
 */
public final class TipoProfissional {

  public static final String PROFESSORA_DEFESA_PESSOAL = "PROFESSORA_DEFESA_PESSOAL";
  public static final String AUXILIAR_DEFESA_PESSOAL = "AUXILIAR_DEFESA_PESSOAL";
  public static final String ASSISTENTE_SOCIAL = "ASSISTENTE_SOCIAL";
  public static final String MEDIADORA_RODA_CONVERSA = "MEDIADORA_RODA_CONVERSA";
  public static final String MONITOR_CRIANCA = "MONITOR_CRIANCA";

  public static final List<String> TODOS =
      List.of(
          PROFESSORA_DEFESA_PESSOAL,
          AUXILIAR_DEFESA_PESSOAL,
          ASSISTENTE_SOCIAL,
          MEDIADORA_RODA_CONVERSA,
          MONITOR_CRIANCA);

  /** Quais chamadas cada função registra. Ausente da lista = nenhuma. */
  private static final Map<String, List<String>> CHAMADAS_POR_TIPO =
      Map.of(
          PROFESSORA_DEFESA_PESSOAL, List.of(TipoChamada.DEFESA_PESSOAL),
          MEDIADORA_RODA_CONVERSA, List.of(TipoChamada.RODA_CONVERSA),
          AUXILIAR_DEFESA_PESSOAL, List.of(),
          MONITOR_CRIANCA, List.of(),
          ASSISTENTE_SOCIAL, List.of());

  private TipoProfissional() {}

  public static boolean valido(String tipo) {
    return tipo != null && TODOS.contains(tipo);
  }

  public static List<String> chamadasPermitidas(String tipo) {
    return CHAMADAS_POR_TIPO.getOrDefault(tipo, List.of());
  }

  /** Se a função registra a chamada informada. */
  public static boolean podeFazerChamada(String tipo, String tipoChamada) {
    return chamadasPermitidas(tipo).contains(tipoChamada);
  }
}
