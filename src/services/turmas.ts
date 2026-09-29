import api from '@/lib/api/client'

export interface Turma {
  id: string
  nucleo_id: string
  codigo: string
  nome: string
  dias_semana: string
  turno: string
  /** Horário próprio da turma, em HH:mm — é o que a candidata escolhe na inscrição. */
  horario_inicio?: string
  horario_fim?: string
  capacidade?: number
  ativo: boolean
}

/** Vínculo de um profissional com uma turma. O tipo define as permissões dentro dela. */
export interface MembroEquipe {
  id: string
  turma_id: string
  user_id: string
  nome: string
  email: string
  avatar?: string | null
  perfil?: string | null
  tipo_profissional: string
  /** Tipos de chamada que esta função registra nesta turma; vazio = não faz chamada. */
  chamadas_permitidas: string[]
}

export interface AlunaTurma {
  inscricao_id: string
  user_id: string
  nome_completo: string
  turma_id?: string | null
}

/** Turma em que a pessoa logada atua, com o papel e as permissões daquele vínculo. */
export interface MinhaTurma {
  vinculo_id: string
  turma: Turma
  tipo_profissional: string
  /** Tipos de chamada que esta função registra nesta turma; vazio = não faz chamada. */
  chamadas_permitidas: string[]
  nucleo_id: string
  nucleo_nome: string
  nucleo_codigo: string
  projeto_id?: string | null
  projeto_nome: string
}

export const getTurmas = (nucleoId: string) =>
  api.get<Turma[]>(`/api/turmas?nucleo_id=${encodeURIComponent(nucleoId)}`)

export const getTurma = (id: string) => api.get<Turma>(`/api/turmas/${id}`)

export const getMinhasTurmas = () => api.get<MinhaTurma[]>('/api/turmas/minhas')

export const criarTurma = (data: Partial<Turma>) => api.post<Turma>('/api/turmas', data)

export const editarTurma = (id: string, data: Partial<Turma>) =>
  api.put<Turma>(`/api/turmas/${id}`, data)

/**
 * Exclui a turma. Exige a senha da Gestão Geral e é recusada pelo backend quando a turma já tem
 * aluna alocada, chamada ou registro de aula — nesses casos o caminho é desativá-la na edição.
 */
export const excluirTurma = (id: string, senha: string) =>
  api.delete<void>(`/api/turmas/${id}`, { senha })

export const getEquipeTurma = (turmaId: string) =>
  api.get<MembroEquipe[]>(`/api/turmas/${turmaId}/equipe`)

export const vincularProfissional = (
  turmaId: string,
  userId: string,
  tipoProfissional: string,
) =>
  api.post<MembroEquipe>(`/api/turmas/${turmaId}/equipe`, {
    user_id: userId,
    tipo_profissional: tipoProfissional,
  })

export const desvincularProfissional = (turmaId: string, userId: string) =>
  api.delete<void>(`/api/turmas/${turmaId}/equipe/${userId}`)

export const getAlunasTurma = (turmaId: string) =>
  api.get<AlunaTurma[]>(`/api/turmas/${turmaId}/alunas`)

export const alocarAluna = (turmaId: string, userId: string) =>
  api.post<AlunaTurma>(`/api/turmas/${turmaId}/alunas`, { user_id: userId })

/** Resultado da alocação em lote: quem entrou, quem já estava e quem foi recusada (e por quê). */
export interface AlocacaoEmLote {
  turma_id: string
  alocadas: string[]
  ja_na_turma: string[]
  recusadas: { user_id: string; nome?: string; motivo: string }[]
}

/**
 * Aloca várias alunas na turma de uma vez. Recusas individuais (outro núcleo, turma lotada) não
 * derrubam o lote — as válidas entram e a resposta explica quem ficou de fora.
 */
export const alocarAlunasEmLote = (turmaId: string, alunasIds: string[]) =>
  api.post<AlocacaoEmLote>(`/api/turmas/${turmaId}/alunas/lote`, { alunas_ids: alunasIds })

export const desalocarAluna = (turmaId: string, userId: string) =>
  api.delete<void>(`/api/turmas/${turmaId}/alunas/${userId}`)
