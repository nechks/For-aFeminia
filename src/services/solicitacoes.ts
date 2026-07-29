import api from '@/lib/api/client'

export interface Solicitacao {
  id: string
  tipo: string
  dados: string
  solicitado_por: string
  solicitado_por_nome: string
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA'
  analisado_por?: string
  observacao?: string
  created: string
  updated: string
}

export const getSolicitacoes = async (): Promise<Solicitacao[]> => {
  return api.get<Solicitacao[]>('/api/solicitacoes')
}

export const solicitarCriacaoAluna = async (data: {
  name: string
  email: string
  password: string
}): Promise<Solicitacao> => {
  return api.post<Solicitacao>('/api/solicitacoes/criacao-aluna', data)
}

export const aprovarSolicitacao = async (
  id: string,
  atribuicao?: {
    nucleo: string
    turma_id: string
    tipo_profissional: string
  },
): Promise<Solicitacao> => {
  return api.patch<Solicitacao>(`/api/solicitacoes/${id}/aprovar`, atribuicao)
}

export const recusarSolicitacao = async (id: string, observacao?: string): Promise<Solicitacao> => {
  return api.patch<Solicitacao>(`/api/solicitacoes/${id}/recusar`, { observacao })
}
