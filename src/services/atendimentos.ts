import pb from '@/lib/pocketbase/client'
import { Atendimento, FichaInscricaoFF, TipoAcessoAtendimento } from '@/lib/types'

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
    sort: '-data,-horario',
    expand: 'created_by,aluna_id',
  }) as unknown as Atendimento[]
}

export const criarAtendimento = async (
  userId: string,
  data: CriarAtendimentoData,
): Promise<Atendimento> => {
  return pb.collection('atendimentos').create({
    ...data,
    created_by: userId,
  }) as unknown as Atendimento
}

export const deletarAtendimento = async (id: string): Promise<void> => {
  await pb.collection('atendimentos').delete(id)
}
