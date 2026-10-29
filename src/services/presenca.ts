import api from '@/lib/api/client'
import { Presenca } from '@/lib/types'

export interface PresencaAluno {
  inscricao_id: string
  user_id: string
  nome_completo: string
  turma: string
  turma_id: string
  presenca: {
    id: string
    presente: boolean
    justificada: boolean
    justificativa: string
  } | null
}

export interface PresencaTurmaResponse {
  turma_id: string
  turma_nome: string
  tipo_chamada: string
  data_aula: string
  alunos: PresencaAluno[]
}

export interface RegistroPresenca {
  user_id: string
  presente: boolean
  justificada: boolean
  justificativa?: string
}

/**
 * Cada turma tem duas chamadas independentes no mesmo dia de aula (Defesa Pessoal e Roda de
 * Conversa), por isso o tipo faz parte da identidade do registro.
 */
export const getPresencasTurma = async (
  turmaId: string,
  dataAula: string,
  tipoChamada: string,
): Promise<PresencaTurmaResponse> => {
  const params = new URLSearchParams({
    turma_id: turmaId,
    data_aula: dataAula,
    tipo_chamada: tipoChamada,
  })
  return api.get<PresencaTurmaResponse>(`/api/professor/presenca?${params.toString()}`)
}

export const registrarPresencas = async (
  turmaId: string,
  dataAula: string,
  tipoChamada: string,
  registros: RegistroPresenca[],
): Promise<any> => {
  return api.post('/api/professor/presenca', {
    turma_id: turmaId,
    data_aula: dataAula,
    tipo_chamada: tipoChamada,
    registros,
  })
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
