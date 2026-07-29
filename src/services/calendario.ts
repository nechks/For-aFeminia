import api from '@/lib/api/client'
import { CalendarioAula } from '@/lib/types'

export const getCalendarioByTurma = async (turma: string): Promise<CalendarioAula[]> => {
  return api.get<CalendarioAula[]>(`/api/calendario?turma=${encodeURIComponent(turma)}`)
}

export const getCalendario = async (): Promise<CalendarioAula[]> => {
  return api.get<CalendarioAula[]>('/api/calendario')
}

export const createCalendarioAula = async (data: {
  turma: string
  data_aula: string
}): Promise<CalendarioAula> => {
  return api.post<CalendarioAula>('/api/calendario', data)
}

export const deleteCalendarioAula = async (id: string): Promise<void> => {
  await api.delete(`/api/calendario/${id}`)
}
