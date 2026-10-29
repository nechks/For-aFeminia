package br.org.atkdgv.forcafeminina.domain;

import java.util.List;

/** Cada turma tem duas chamadas independentes no mesmo dia de aula. */
public final class TipoChamada {

  public static final String DEFESA_PESSOAL = "DEFESA_PESSOAL";
  public static final String RODA_CONVERSA = "RODA_CONVERSA";

  public static final List<String> TODOS = List.of(DEFESA_PESSOAL, RODA_CONVERSA);

  private TipoChamada() {}

  public static boolean valido(String tipo) {
    return tipo != null && TODOS.contains(tipo);
  }
}
