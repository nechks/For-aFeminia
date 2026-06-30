import pb from '@/lib/pocketbase/client'
import { Presenca } from '@/lib/types'

export interface PresencaAluno {
  inscricao_id: string
  user_id: string
  nome_completo: string
  turma: string
  presenca: {
    id: string
    presente: boolean
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
  justificativa?: string
}

export const getPresencasTurma = async (
  turma: string,
  dataAula: string,
): Promise<PresencaTurmaResponse> => {
  const params = new URLSearchParams({ turma, dataAula })
  return pb.send(`/backend/v1/professor/presenca?${params.toString()}`, { method: 'GET' })
}

export const registrarPresencas = async (
  dataAula: string,
  registros: RegistroPresenca[],
): Promise<any> => {
  return pb.send('/backend/v1/professor/presenca', {
    method: 'POST',
    body: JSON.stringify({ dataAula, registros }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getMinhasPresencas = async (userId: string): Promise<Presenca[]> => {
  return await pb.collection('presenca').getFullList({
    filter: `user_id = "${userId}"`,
    sort: '-data_aula',
  })
}
