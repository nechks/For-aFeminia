// Rótulos e regras compartilhados por núcleos, turmas, equipe e chamada.

export const diasSemana = [
  ['MONDAY', 'Segunda'],
  ['TUESDAY', 'Terça'],
  ['WEDNESDAY', 'Quarta'],
  ['THURSDAY', 'Quinta'],
  ['FRIDAY', 'Sexta'],
  ['SATURDAY', 'Sábado'],
  ['SUNDAY', 'Domingo'],
] as const

export const diaLabel = (valor: string): string =>
  diasSemana.find(([v]) => v === valor)?.[1] ?? valor

export const formatarDias = (diasSemana?: string): string =>
  (diasSemana ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .map(diaLabel)
    .join(', ')

export const turnos = [
  ['MANHA', '🌅 Manhã'],
  ['TARDE', '☀️ Tarde'],
  ['NOITE', '🌙 Noite'],
] as const

export const turnoLabel = (valor?: string): string =>
  turnos.find(([v]) => v === valor)?.[1] ?? valor ?? '—'

export const tiposProfissionais = [
  ['PROFESSORA_DEFESA_PESSOAL', 'Professora de Defesa Pessoal'],
  ['AUXILIAR_DEFESA_PESSOAL', 'Auxiliar de Defesa Pessoal'],
  ['ASSISTENTE_SOCIAL', 'Assistente Social'],
  ['MEDIADORA_RODA_CONVERSA', 'Mediadora de Roda de Conversa'],
  ['MONITOR_CRIANCA', 'Monitor de Criança'],
] as const

export const tipoProfissionalLabel = (valor?: string): string =>
  tiposProfissionais.find(([v]) => v === valor)?.[1] ?? valor ?? 'Equipe'

export type TipoChamada = 'DEFESA_PESSOAL' | 'RODA_CONVERSA'

export const tiposChamada = [
  ['DEFESA_PESSOAL', '🥋 Defesa Pessoal'],
  ['RODA_CONVERSA', '💬 Roda de Conversa'],
] as const

export const tipoChamadaLabel = (valor?: string): string =>
  tiposChamada.find(([v]) => v === valor)?.[1] ?? valor ?? '—'

/**
 * Cada profissional só acessa a chamada da própria função. Espelha TipoProfissional no backend,
 * que continua sendo a autoridade — isto aqui só decide o que aparece na tela.
 */
export const chamadasPorTipoProfissional: Record<string, TipoChamada[]> = {
  PROFESSORA_DEFESA_PESSOAL: ['DEFESA_PESSOAL'],
  MEDIADORA_RODA_CONVERSA: ['RODA_CONVERSA'],
  AUXILIAR_DEFESA_PESSOAL: [],
  MONITOR_CRIANCA: [],
  ASSISTENTE_SOCIAL: [],
}

export const chamadasPermitidas = (tipoProfissional?: string): TipoChamada[] =>
  chamadasPorTipoProfissional[tipoProfissional ?? ''] ?? []

/** O que a função faz na turma quando não registra chamada — explica a aba para a pessoa. */
export const semChamadaMotivo: Record<string, string> = {
  AUXILIAR_DEFESA_PESSOAL:
    'Auxiliar de Defesa Pessoal atua no planejamento da aula; a chamada é da Professora de Defesa Pessoal.',
  MONITOR_CRIANCA:
    'Monitor de Criança acompanha as crianças durante a aula e não registra chamada de aluna.',
  ASSISTENTE_SOCIAL:
    'Assistente Social acompanha as alunas por atendimentos e alertas, não pela chamada.',
}

/**
 * Cada chamada vale meia aula: presença na Defesa Pessoal e na Roda de Conversa do mesmo dia
 * completa uma aula. Por isso os totais de frequência aparecem com meias (ex.: "3,5").
 */
export const formatarAulas = (valor?: number): string =>
  (valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
