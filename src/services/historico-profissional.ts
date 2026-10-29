import api from '@/lib/api/client'

export type TipoHistorico =
  | 'AVALIACAO_POSITIVA'
  | 'AVALIACAO_NEGATIVA'
  | 'CONVERSA'
  | 'ADVERTENCIA'
  | 'OBSERVACAO'

export interface ProfissionalResumo {
  id: string
  nome: string
  nome_social?: string | null
  email: string
  avatar?: string | null
  ativo: boolean
  tipo_profissional?: string | null
  vinculos?: number
  advertencias?: number
}

export interface ParticipacaoProfissional {
  projeto_nome: string
  nucleo_nome: string
  turma_nome: string
  tipo_profissional: string
  inicio: string
  fim?: string | null
  ativo: boolean
}

export interface RegistroHistorico {
  id: string
  tipo: TipoHistorico
  data_registro: string
  titulo: string
  descricao: string
  visivel_profissional: boolean
  registrado_por_nome: string
  created: string
}

export interface HistoricoProfissional {
  profissional: ProfissionalResumo
  participacoes: ParticipacaoProfissional[]
  assiduidade: {
    chamadas_registradas: number
    registros_aula: number
  }
  registros: RegistroHistorico[]
}

export interface NovoRegistroHistorico {
  tipo: TipoHistorico
  data_registro: string
  titulo: string
  descricao: string
  visivel_profissional: boolean
}

export const getMeuHistorico = () =>
  api.get<HistoricoProfissional>('/api/historico-profissionais/meu')

export const getProfissionaisHistorico = () =>
  api.get<ProfissionalResumo[]>('/api/historico-profissionais')

export const getHistoricoProfissional = (id: string) =>
  api.get<HistoricoProfissional>(`/api/historico-profissionais/${id}`)

export const criarRegistroHistorico = (id: string, dados: NovoRegistroHistorico) =>
  api.post<RegistroHistorico>(`/api/historico-profissionais/${id}/registros`, dados)
