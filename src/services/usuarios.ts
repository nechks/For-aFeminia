import pb from '@/lib/pocketbase/client'
import { Usuario } from '@/lib/types'

export const updateUserTurma = async (userId: string, turma: string): Promise<Usuario> => {
  return (await pb.collection('users').update(userId, { turma })) as unknown as Usuario
}

export const updateUser = async (userId: string, data: Partial<Usuario>): Promise<Usuario> => {
  return (await pb.collection('users').update(userId, data)) as unknown as Usuario
}
