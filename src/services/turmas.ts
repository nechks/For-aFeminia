import api from '@/lib/api/client'
export interface Turma {
  id: string
  nucleo_id: string
  codigo: string
  nome: string
  dias_semana: string
  turno: string
  capacidade?: number
  ativo: boolean
}
export const getTurmas = (nucleoId: string) =>
  api.get<Turma[]>(`/api/turmas?nucleo_id=${encodeURIComponent(nucleoId)}`)
export const criarTurma = (data: Partial<Turma>) => api.post<Turma>('/api/turmas', data)
