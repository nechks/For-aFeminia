import api from '@/lib/api/client'

export interface Solicitacao {
  id: string
  tipo: string
  nucleo?: string
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
  nucleo: string
}): Promise<Solicitacao> => {
  return api.post<Solicitacao>('/api/solicitacoes/criacao-aluna', data)
}

/**
 * Aprovar um cadastro de profissional é só validar o cadastro dele. O vínculo com o projeto é feito
 * no cadastro do projeto e o vínculo com a turma, na tela do núcleo.
 */
export const aprovarSolicitacao = async (id: string): Promise<Solicitacao> => {
  return api.patch<Solicitacao>(`/api/solicitacoes/${id}/aprovar`)
}

export const recusarSolicitacao = async (id: string, observacao?: string): Promise<Solicitacao> => {
  return api.patch<Solicitacao>(`/api/solicitacoes/${id}/recusar`, { observacao })
}
