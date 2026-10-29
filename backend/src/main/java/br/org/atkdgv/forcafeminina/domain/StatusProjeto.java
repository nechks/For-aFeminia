package br.org.atkdgv.forcafeminina.domain;

/**
 * Situação do projeto no ciclo de vida dele. Substitui o antigo booleano {@code ativo}, que ainda é
 * mantido em {@link Projeto} como espelho de {@code ATIVO} para não quebrar as telas e regras que já
 * perguntam "o projeto está ativo?".
 *
 * <p>{@code EM_ESPERA} é o projeto aprovado mas que ainda não começou (ou está pausado); ele não
 * derruba o acesso das alunas, diferente de {@code FINALIZADO}.
 */
public enum StatusProjeto {
  ATIVO,
  FINALIZADO,
  EM_ESPERA;

  public static StatusProjeto parse(String valor) {
    if (valor == null || valor.isBlank()) return null;
    try {
      return StatusProjeto.valueOf(valor.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      return null;
    }
  }
}
