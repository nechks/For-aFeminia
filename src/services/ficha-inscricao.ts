import api from '@/lib/api/client'
import { FichaInscricaoFF, StatusInscricao } from '@/lib/types'

export interface PaginatedInscricoes {
  items: FichaInscricaoFF[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export interface InscricaoFilter {
  status?: string
  turma?: string
  search?: string
  page?: number
  perPage?: number
}

export const getInscricoesPaginated = async (
  filter: InscricaoFilter = {},
): Promise<PaginatedInscricoes> => {
  const { page = 1, perPage = 10, status, turma, search } = filter
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  if (status && status !== 'ALL') params.set('status', status)
  if (turma && turma !== 'ALL') params.set('turma', turma)
  if (search && search.trim()) params.set('search', search.trim())

  return api.get<PaginatedInscricoes>(`/api/inscricoes?${params.toString()}`)
}

export const getInscricoes = async (): Promise<FichaInscricaoFF[]> => {
  return api.get<FichaInscricaoFF[]>('/api/inscricoes/all')
}

export const getAlunasByTurma = async (turma: string): Promise<FichaInscricaoFF[]> => {
  return await pb.collection('ficha_inscricao_ff').getFullList({
    filter: `turma = "${turma}" && status = "APROVADA"`,
    sort: 'nome_completo',
  })
}

export const getInscricao = async (id: string): Promise<FichaInscricaoFF> => {
  return api.get<FichaInscricaoFF>(`/api/inscricoes/${id}`)
}

export const getMinhaInscricao = async (_userId: string): Promise<FichaInscricaoFF | null> => {
  try {
    return await api.get<FichaInscricaoFF | null>('/api/inscricoes/minha')
  } catch {
    return null
  }
}

export const createInscricao = async (
  data: Partial<FichaInscricaoFF>,
): Promise<FichaInscricaoFF> => {
  return api.post<FichaInscricaoFF>('/api/inscricao/forca-feminina', data)
}

export const updateInscricao = async (
  id: string,
  data: Partial<FichaInscricaoFF>,
): Promise<FichaInscricaoFF> => {
  return api.patch<FichaInscricaoFF>(`/api/inscricoes/${id}`, data)
}

export const updateStatus = async (
  id: string,
  status: StatusInscricao,
  extraData?: Record<string, unknown>,
): Promise<FichaInscricaoFF> => {
  return api.patch<FichaInscricaoFF>(`/api/inscricoes/${id}`, { status, ...extraData })
}
