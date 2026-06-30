import pb from '@/lib/pocketbase/client'
import { Mural } from '@/lib/types'

export const getMural = async (): Promise<Mural[]> => {
  return await pb.collection('mural').getFullList({ sort: '-data_publicacao' })
}

export const getMuralByTurma = async (turma: string): Promise<Mural[]> => {
  return await pb.collection('mural').getFullList({
    filter: `turma = "" || turma = "${turma}"`,
    sort: '-data_publicacao',
  })
}

export const createMural = async (data: {
  titulo: string
  conteudo: string
  turma?: string
}): Promise<Mural> => {
  return await pb.send('/backend/v1/admin/mural', {
    method: 'POST',
    body: JSON.stringify({
      titulo: data.titulo,
      conteudo: data.conteudo,
      turma: data.turma ?? '',
      data_publicacao: new Date().toISOString().split('T')[0],
    }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const deleteMural = async (id: string): Promise<void> => {
  await pb.collection('mural').delete(id)
}

export const updateMural = async (id: string, data: Partial<Mural>): Promise<Mural> => {
  return await pb.collection('mural').update(id, data)
}
