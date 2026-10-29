import api from '@/lib/api/client'
import { Mural } from '@/lib/types'

export const getMural = async (): Promise<Mural[]> => {
  return api.get<Mural[]>('/api/mural')
}

export const getMuralByTurma = async (turma: string): Promise<Mural[]> => {
  return api.get<Mural[]>(`/api/mural?turma=${encodeURIComponent(turma)}`)
}

export const createMural = async (data: {
  titulo: string
  conteudo: string
  turma?: string
  exibirAte?: string
}): Promise<Mural> => {
  return api.post<Mural>('/api/admin/mural', {
    titulo: data.titulo,
    conteudo: data.conteudo,
    turma: data.turma ?? '',
    data_publicacao: new Date().toISOString().split('T')[0],
    exibir_ate: data.exibirAte || undefined,
  })
}

export const deleteMural = async (id: string): Promise<void> => {
  await api.delete(`/api/mural/${id}`)
}

export const updateMural = async (id: string, data: Partial<Mural>): Promise<Mural> => {
  return api.patch<Mural>(`/api/mural/${id}`, data)
}
