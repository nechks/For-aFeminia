import pb from '@/lib/pocketbase/client'
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
  const filters: string[] = []

  if (status && status !== 'ALL') {
    filters.push(`status = "${status}"`)
  }
  if (turma && turma !== 'ALL') {
    filters.push(`turma = "${turma}"`)
  }
  if (search && search.trim()) {
    const term = search.trim()
    filters.push(`(nome_completo ~ "${term}" || cpf ~ "${term}")`)
  }

  const filterStr = filters.join(' && ')
  const result = await pb.collection('ficha_inscricao_ff').getList(page, perPage, {
    sort: '-created',
    ...(filterStr ? { filter: filterStr } : {}),
  })

  return {
    items: result.items as unknown as FichaInscricaoFF[],
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
    perPage: result.perPage,
  }
}

export const getInscricoes = async (): Promise<FichaInscricaoFF[]> => {
  return await pb.collection('ficha_inscricao_ff').getFullList({ sort: '-created' })
}

export const getAlunasByTurma = async (turma: string): Promise<FichaInscricaoFF[]> => {
  return await pb.collection('ficha_inscricao_ff').getFullList({
    filter: `turma = "${turma}" && status = "APROVADA"`,
    sort: 'nome_completo',
  })
}

export const getInscricao = async (id: string): Promise<FichaInscricaoFF> => {
  return await pb.collection('ficha_inscricao_ff').getOne(id)
}

export const getMinhaInscricao = async (userId: string): Promise<FichaInscricaoFF | null> => {
  try {
    return await pb.collection('ficha_inscricao_ff').getFirstListItem(`user_id = "${userId}"`)
  } catch {
    return null
  }
}

export const createInscricao = async (
  data: Partial<FichaInscricaoFF>,
): Promise<FichaInscricaoFF> => {
  return await pb.collection('ficha_inscricao_ff').create({ ...data, status: 'AGUARDANDO' })
}

export const updateInscricao = async (
  id: string,
  data: Partial<FichaInscricaoFF>,
): Promise<FichaInscricaoFF> => {
  return await pb.collection('ficha_inscricao_ff').update(id, data)
}

export const updateStatus = async (
  id: string,
  status: StatusInscricao,
  extraData?: Record<string, unknown>,
): Promise<FichaInscricaoFF> => {
  return await pb.collection('ficha_inscricao_ff').update(id, { status, ...extraData })
}
