/**
 * Pesos da fila de prioridade das inscrições.
 *
 * Espelha `aplicarPontuacao` em `InscricaoController.java`: morar na cidade e na zona prioritária
 * do núcleo vale 80 dos 100 pontos, e os outros nove critérios dividem igualmente os 20 restantes.
 * Critério não atendido não pontua. Mudou a regra lá, mude aqui.
 */
export const CRITERIO_ZONA = 'Cidade e zona prioritária do núcleo'

export const PONTOS_ZONA = 80
export const PONTOS_DEMAIS = 20
export const TOTAL_CRITERIOS = 10
export const PONTUACAO_MAXIMA = PONTOS_ZONA + PONTOS_DEMAIS

export const pontosDoCriterio = (criterio: string): number =>
  criterio === CRITERIO_ZONA ? PONTOS_ZONA : PONTOS_DEMAIS / (TOTAL_CRITERIOS - 1)

/** `80` fica "80"; `2.222…` fica "2,2". */
export const formatarPontos = (valor: number): string =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')
