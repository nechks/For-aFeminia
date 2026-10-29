import api, { authStore } from '@/lib/api/client'

export interface EventoPergunta {
  id: string
  evento_id: string
  ordem: number
  pergunta: string
  /** Alternativas fixas de resposta. Vazio = pergunta legada de texto livre. */
  opcoes: string[]
}

export interface EventoInscricaoAluna {
  id: string
  evento_id: string
  user_id: string
  respostas: string
  presente: boolean | null
  created: string
}

export interface Evento {
  id: string
  titulo: string
  descricao: string
  data_evento: string
  horario_inicio: string
  horario_fim: string
  professores: { id: string; nome: string }[]
  turma: string
  encerrado: boolean
  perguntas: EventoPergunta[]
  total_inscritas: number
  minha_inscricao?: EventoInscricaoAluna | null
}

export interface EventoInscricaoDetalhe {
  id: string
  user_id: string
  aluna_nome: string
  turma: string
  respostas: string
  presente: boolean | null
  created: string
}

export interface RespostaEvento {
  pergunta: string
  resposta: string
}

export const getEventos = async (): Promise<Evento[]> => {
  return api.get<Evento[]>('/api/eventos')
}

export interface NovaPergunta {
  pergunta: string
  opcoes: string[]
}

export const criarEvento = async (data: {
  titulo: string
  descricao: string
  data_evento: string
  horario_inicio: string
  horario_fim: string
  professor_ids: string[]
  turma?: string
  perguntas: NovaPergunta[]
}): Promise<any> => {
  return api.post('/api/eventos', { ...data, turma: data.turma ?? '' })
}

export const inscreverNoEvento = async (
  eventoId: string,
  respostas: RespostaEvento[],
): Promise<EventoInscricaoAluna> => {
  return api.post<EventoInscricaoAluna>(`/api/eventos/${eventoId}/inscrever`, { respostas })
}

export const getInscricoesEvento = async (
  eventoId: string,
): Promise<EventoInscricaoDetalhe[]> => {
  return api.get<EventoInscricaoDetalhe[]>(`/api/eventos/${eventoId}/inscricoes`)
}

export const registrarChamadaEvento = async (
  eventoId: string,
  registros: { inscricao_id: string; presente: boolean }[],
): Promise<any> => {
  return api.post(`/api/eventos/${eventoId}/chamada`, { registros })
}

/** Baixa a planilha Excel do evento (nome, respostas e comparecimento). */
export const exportarEventoExcel = async (eventoId: string, titulo: string): Promise<void> => {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'
  const res = await fetch(`${base}/api/eventos/${eventoId}/export`, {
    headers: { Authorization: `Bearer ${authStore.token}` },
  })
  if (!res.ok) throw new Error('Erro ao exportar a planilha.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `evento_${titulo.replace(/[^\w]+/g, '_')}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
