import api from '@/lib/api/client'
import { Presenca } from '@/lib/types'

export interface PresencaAluno {
  inscricao_id: string
  user_id: string
  nome_completo: string
  turma: string
  presenca: {
    id: string
    presente: boolean
    justificada: boolean
    justificativa: string
  } | null
}

export interface PresencaTurmaResponse {
  turma: string
  dataAula: string
  alunos: PresencaAluno[]
}

export interface RegistroPresenca {
  user_id: string
  presente: boolean
  justificada: boolean
  justificativa?: string
}

export const getPresencasTurma = async (
  turma: string,
  dataAula: string,
): Promise<PresencaTurmaResponse> => {
  const params = new URLSearchParams({ turma, dataAula })
  return api.get<PresencaTurmaResponse>(`/api/professor/presenca?${params.toString()}`)
}

export const registrarPresencas = async (
  dataAula: string,
  registros: RegistroPresenca[],
  turma?: string,
): Promise<any> => {
  return api.post('/api/professor/presenca', { dataAula, turma, registros })
}

export interface PresencaDetalhe {
  id: string
  user_id: string
  aluna_nome: string
  turma: string
  data_aula: string
  presente: boolean
  justificativa: string
  professor_nome: string
}

export const getPresencasDetalhes = async (presente: boolean): Promise<PresencaDetalhe[]> => {
  return api.get<PresencaDetalhe[]>(`/api/presencas/detalhes?presente=${presente}`)
}

export const getMinhasPresencas = async (_userId: string): Promise<Presenca[]> => {
  return api.get<Presenca[]>('/api/presencas/minhas')
}
