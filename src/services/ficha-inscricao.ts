import pb from '@/lib/pocketbase/client'
import { FichaInscricaoFF, StatusInscricao } from '@/lib/types'

export const getInscricoes = async (): Promise<FichaInscricaoFF[]> => {
  return await pb.collection('ficha_inscricao_ff').getFullList({ sort: '-created' })
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

export const updateStatus = async (
  id: string,
  status: StatusInscricao,
): Promise<FichaInscricaoFF> => {
  return await pb.collection('ficha_inscricao_ff').update(id, { status })
}
