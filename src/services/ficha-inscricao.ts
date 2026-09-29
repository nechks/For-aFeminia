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

/** Uma criança declarada na ficha de confirmação, com a marcação da faixa etária da vaga. */
export interface CriancaDeclarada {
  nome: string
  data_nascimento?: string | null
  idade?: number | null
  dentro_da_faixa: boolean
}

/** Situação da vaga da criança de 5 a 12 anos, decidida à parte da aprovação da aluna. */
export interface VagaCrianca {
  inscricao_id: string
  status?: 'APROVADA' | 'NAO_APROVADA' | null
  justificativa?: string | null
  decidido_por_nome?: string | null
  decidido_em?: string | null
  idade_minima: number
  idade_maxima: number
  criancas: CriancaDeclarada[]
  /** Se o projeto do núcleo da aluna oferece Espaço Kids hoje. */
  espaco_kids_projeto?: boolean
  /** Se a aluna pediu a vaga na inscrição ("Sim"/"Não"). */
  solicitado?: string | null
}

/** Ficha entregue que ainda espera a gestão marcar a data da 1ª aula. */
export interface AguardandoPrimeiraAula {
  inscricao_id: string
  user_id: string
  nome_completo: string
  telefone?: string | null
  nucleo_codigo?: string | null
  nucleo_nome?: string | null
  turma_id?: string | null
  confirmacao_id: string
  ficha_enviada_em: string
}

export const getVagaCrianca = (inscricaoId: string) =>
  api.get<VagaCrianca>(`/api/inscricoes/${inscricaoId}/vaga-crianca`)

export const decidirVagaCrianca = (
  inscricaoId: string,
  status: 'APROVADA' | 'NAO_APROVADA',
  justificativa?: string,
) =>
  api.patch<VagaCrianca>(`/api/inscricoes/${inscricaoId}/vaga-crianca`, { status, justificativa })

export const getAguardandoPrimeiraAula = () =>
  api.get<AguardandoPrimeiraAula[]>('/api/inscricoes/aguardando-primeira-aula')

/** Marca a data da aula inaugural. Salvar dispara o aviso para a aluna e tira o registro da fila. */
export const definirDataPrimeiraAula = (inscricaoId: string, data: string) =>
  api.patch<FichaInscricaoFF>(`/api/inscricoes/${inscricaoId}`, { data_primeira_aula: data })
