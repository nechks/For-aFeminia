import api from '@/lib/api/client'
import { FichaConfirmacaoFF, DocumentosAnexos } from '@/lib/types'

export const submitConfirmacao = async (formData: FormData): Promise<any> => {
  return api.postForm('/api/confirmacao', formData)
}

/**
 * Devolve `null` apenas quando o servidor confirma que não há ficha (204). Falha de rede propaga o
 * erro de propósito: tratar "não consegui consultar" como "não tem ficha" fecha o acesso de uma
 * aluna que já entregou a dela e a joga de volta no formulário.
 */
export const getMinhaConfirmacao = async (_userId: string): Promise<FichaConfirmacaoFF | null> =>
  api.get<FichaConfirmacaoFF | null>('/api/confirmacoes/minha')

export const getConfirmacoes = async (): Promise<FichaConfirmacaoFF[]> => {
  return api.get<FichaConfirmacaoFF[]>('/api/confirmacoes')
}

export const getConfirmacao = async (id: string): Promise<FichaConfirmacaoFF> => {
  return api.get<FichaConfirmacaoFF>(`/api/confirmacoes/${id}`)
}

export const getDocumentos = async (confirmacaoId: string): Promise<DocumentosAnexos[]> => {
  return api.get<DocumentosAnexos[]>(`/api/confirmacoes/${confirmacaoId}/documentos`)
}

export const updateSecaoConfidencial = async (
  id: string,
  secao: 'secao_6_socioeconomico' | 'secao_7_violencia',
  data: Record<string, unknown>,
): Promise<FichaConfirmacaoFF> => {
  return api.patch<FichaConfirmacaoFF>(`/api/confirmacoes/${id}/secao`, { secao, dados: data })
}
