import pb from '@/lib/pocketbase/client'
import { FichaConfirmacaoFF, DocumentosAnexos } from '@/lib/types'

export const submitConfirmacao = async (formData: FormData): Promise<any> => {
  const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/confirmacao`, {
    method: 'POST',
    headers: { Authorization: pb.authStore.token },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export const getMinhaConfirmacao = async (userId: string): Promise<FichaConfirmacaoFF | null> => {
  try {
    return await pb.collection('ficha_confirmacao_ff').getFirstListItem(`user_id = "${userId}"`)
  } catch {
    return null
  }
}

export const getConfirmacoes = async (): Promise<FichaConfirmacaoFF[]> => {
  return await pb.collection('ficha_confirmacao_ff').getFullList({ sort: '-created' })
}

export const getConfirmacao = async (id: string): Promise<FichaConfirmacaoFF> => {
  return await pb.collection('ficha_confirmacao_ff').getOne(id)
}

export const getDocumentos = async (confirmacaoId: string): Promise<DocumentosAnexos[]> => {
  return await pb.collection('documentos_anexos').getFullList({
    filter: `confirmacao_id = "${confirmacaoId}"`,
  })
}

export const updateSecaoConfidencial = async (
  id: string,
  secao: 'secao_6_socioeconomico' | 'secao_7_violencia',
  data: Record<string, unknown>,
): Promise<FichaConfirmacaoFF> => {
  return await pb.collection('ficha_confirmacao_ff').update(id, { [secao]: data })
}
