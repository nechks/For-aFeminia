import api from '@/lib/api/client'

export interface AvaliacaoAluna {
  id: string
  user_id: string
  turma_id: string
  data_avaliacao: string
  /** Nota que a aluna se dá; a professora apenas registra o valor informado por ela. */
  nota_autoavaliacao: number
  feedback_professora?: string
  registrado_por: string
  reflexao_aluna?: string | null
  created: string
  updated: string
}

export interface AlunaParaAvaliacao {
  user_id: string
  nome_completo: string
  avaliacao?: AvaliacaoAluna | null
}

export interface AvaliacoesDaTurma {
  turma_id: string
  turma_nome: string
  data_avaliacao: string
  alunas: AlunaParaAvaliacao[]
}

export interface RegistroAutoavaliacao {
  user_id: string
  nota_autoavaliacao: number
  feedback_professora: string
}

export const getAvaliacoesTurma = (turmaId: string, dataAvaliacao: string) =>
  api.get<AvaliacoesDaTurma>(
    `/api/professor/avaliacoes?turma_id=${encodeURIComponent(turmaId)}&data_avaliacao=${encodeURIComponent(dataAvaliacao)}`,
  )

export const registrarAvaliacoes = (
  turmaId: string,
  dataAvaliacao: string,
  avaliacoes: RegistroAutoavaliacao[],
) =>
  api.post<{ success: boolean; total: number }>('/api/professor/avaliacoes', {
    turma_id: turmaId,
    data_avaliacao: dataAvaliacao,
    avaliacoes,
  })

export const getMinhasAvaliacoes = () =>
  api.get<AvaliacaoAluna[]>('/api/avaliacoes/minhas')

/** A nota já veio do registro da professora; aqui a aluna só acrescenta a reflexão escrita. */
export const salvarReflexao = (id: string, reflexaoAluna: string) =>
  api.patch<AvaliacaoAluna>(`/api/avaliacoes/${id}/reflexao`, {
    reflexao_aluna: reflexaoAluna,
  })
