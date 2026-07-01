import pb from '@/lib/pocketbase/client'
import { Atendimento, FichaInscricaoFF } from '@/lib/types'

export interface AlunaOpcao {
  userId: string
  nomeCompleto: string
  inscricaoId: string
}

export interface CriarAtendimentoData {
  aluna_id: string
  turma: string
  data_atendimento: string
  descricao: string
  encaminhamento?: string
}

export const getAlunasPorTurma = async (turma: string): Promise<AlunaOpcao[]> => {
  const fichas = (await pb.collection('ficha_inscricao_ff').getFullList({
    filter: `turma = "${turma}" && status = "APROVADA"`,
    sort: 'nome_completo',
  })) as unknown as FichaInscricaoFF[]

  return fichas.map((f) => ({
    userId: f.user_id,
    nomeCompleto: f.nome_completo,
    inscricaoId: f.id,
  }))
}

export const getAtendimentos = async (): Promise<Atendimento[]> => {
  return pb.collection('atendimentos').getFullList({
    sort: '-data_atendimento',
    expand: 'aluna_id,profissional_id',
  }) as unknown as Atendimento[]
}

export const criarAtendimento = async (
  profissionalId: string,
  data: CriarAtendimentoData,
): Promise<Atendimento> => {
  return pb.collection('atendimentos').create({
    ...data,
    profissional_id: profissionalId,
  }) as unknown as Atendimento
}

export const deletarAtendimento = async (id: string): Promise<void> => {
  await pb.collection('atendimentos').delete(id)
}
