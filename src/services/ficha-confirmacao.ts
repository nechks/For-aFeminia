import api from '@/lib/api/client'
import { FichaConfirmacaoFF, DocumentosAnexos } from '@/lib/types'

export const submitConfirmacao = async (formData: FormData): Promise<any> => {
  return api.postForm('/api/confirmacao', formData)
}

export const getMinhaConfirmacao = async (_userId: string): Promise<FichaConfirmacaoFF | null> => {
  try {
    return await api.get<FichaConfirmacaoFF | null>('/api/confirmacoes/minha')
  } catch {
    return null
  }
}

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
