import pb from '@/lib/pocketbase/client'
import { Presenca } from '@/lib/types'

export interface PresencaAluno {
  inscricao_id: string
  user_id: string
  nome_completo: string
  turma: string
  presenca: { id: string; presente: boolean; justificativa: string } | null
}

export interface PresencaTurmaResponse {
  turma: string
  dataAula: string
  alunos: PresencaAluno[]
}

export const getPresencasTurma = async (
  turma: string,
  dataAula: string,
): Promise<PresencaTurmaResponse> => {
  return await pb.send(
    `/backend/v1/presenca/turma/${encodeURIComponent(turma)}/aula/${encodeURIComponent(dataAula)}`,
    { method: 'GET' },
  )
}

export interface RegistroPresenca {
  user_id: string
  presente: boolean
  justificativa?: string
}

export const registrarPresencas = async (
  dataAula: string,
  registros: RegistroPresenca[],
): Promise<any> => {
  return await pb.send('/backend/v1/presenca/registrar', {
    method: 'POST',
    body: JSON.stringify({ data_aula: dataAula, registros }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getMinhasPresencas = async (userId: string): Promise<Presenca[]> => {
  return await pb.collection('presenca').getFullList({
    filter: `user_id = "${userId}"`,
    sort: '-data_aula',
  })
}
