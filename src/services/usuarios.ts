import pb from '@/lib/pocketbase/client'
import { Usuario } from '@/lib/types'

export const updateUserTurma = async (userId: string, turma: string): Promise<Usuario> => {
  const user = (await pb.collection('users').update(userId, { turma })) as unknown as Usuario

  if (user.perfil === 'ALUNA_FF') {
    try {
      const ficha = await pb
        .collection('ficha_inscricao_ff')
        .getFirstListItem(`user_id="${userId}"`)
      if (ficha && ficha.turma !== turma) {
        await pb.collection('ficha_inscricao_ff').update(ficha.id, { turma })
      }
    } catch (_) {
      // ficha not found, it's ok to ignore
    }
  }

  return user
}

export const updateUser = async (userId: string, data: Partial<Usuario>): Promise<Usuario> => {
  return (await pb.collection('users').update(userId, data)) as unknown as Usuario
}
