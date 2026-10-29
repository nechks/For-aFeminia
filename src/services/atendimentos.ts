import api from '@/lib/api/client'
import { Atendimento, TipoAcessoAtendimento } from '@/lib/types'

export interface AlunaOpcao {
  userId: string
  nomeCompleto: string
  inscricaoId: string
}

export interface CriarAtendimentoData {
  data: string
  horario: string
  tipo_acesso: TipoAcessoAtendimento
  relatorio: string
  turma: string
  aluna_id: string
}

export const getAlunasPorTurma = async (turma: string): Promise<AlunaOpcao[]> => {
  const alunas = await api.get<
    { user_id: string; nome_completo: string; inscricao_id: string }[]
  >(`/api/atendimentos/alunas?turma=${encodeURIComponent(turma)}`)

  return alunas.map((a) => ({
    userId: a.user_id,
    nomeCompleto: a.nome_completo,
    inscricaoId: a.inscricao_id,
  }))
}

export const getAtendimentos = async (): Promise<Atendimento[]> => {
  return api.get<Atendimento[]>('/api/atendimentos')
}

export const criarAtendimento = async (
  _userId: string,
  data: CriarAtendimentoData,
): Promise<Atendimento> => {
  // O backend usa o usuário autenticado como created_by
  return api.post<Atendimento>('/api/atendimentos', data)
}

export const deletarAtendimento = async (id: string): Promise<void> => {
  await api.delete(`/api/atendimentos/${id}`)
}
