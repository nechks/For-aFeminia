import pb from '@/lib/pocketbase/client'
import { CalendarioAula } from '@/lib/types'

export const getCalendarioByTurma = async (turma: string): Promise<CalendarioAula[]> => {
  return await pb.collection('calendario_aula').getFullList({
    filter: `turma = "${turma}"`,
    sort: 'data_aula',
  })
}

export const getCalendario = async (): Promise<CalendarioAula[]> => {
  return await pb.collection('calendario_aula').getFullList({ sort: 'data_aula' })
}

export const createCalendarioAula = async (data: {
  turma: string
  data_aula: string
}): Promise<CalendarioAula> => {
  return await pb.collection('calendario_aula').create(data)
}

export const deleteCalendarioAula = async (id: string): Promise<void> => {
  await pb.collection('calendario_aula').delete(id)
}
