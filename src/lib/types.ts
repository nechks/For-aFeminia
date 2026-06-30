export type PerfilUsuario = 'ALUNA_FF' | 'PROFESSOR' | 'ASSISTENTE_SOCIAL' | 'ADMIN' | 'GESTAO'
export type StatusInscricao =
  | 'AGUARDANDO'
  | 'APROVADA'
  | 'REPROVADA'
  | 'EM_ANALISE'
  | 'LISTA_ESPERA'
  | 'CANCELADA'
export type TurmaFF =
  | 'CENTRO_VITORIA'
  | 'AEST_SERRA'
  | 'ITAQUARI_CARIACICA'
  | 'CONJUNTO_CARAPINA_SERRA'
  | 'ATLANTICA_VILLE_VITORIA'

export interface Usuario {
  id: string
  name: string
  email: string
  perfil: PerfilUsuario
  ativo: boolean
  avatar?: string
  created: string
  updated: string
}

export interface FichaInscricaoFF {
  id: string
  user_id: string
  nome_completo: string
  cpf: string
  rg?: string
  data_nascimento?: string
  telefone?: string
  endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  turma?: string
  status: StatusInscricao
  aceite_lgpd: boolean
  data_primeira_aula?: string
  motivo_cancelamento?: string
  created: string
  updated: string
}

export type StatusConfirmacao = 'PREENCHIDA' | 'EM_REVISAO'

export interface FichaConfirmacaoFF {
  id: string
  user_id: string
  inscricao_id: string
  status: StatusConfirmacao
  secao_1_dados: string
  secao_2_dados: string
  secao_3_dados: string
  secao_4_dados: string
  secao_5_dados: string
  secao_6_socioeconomico: string
  secao_7_violencia: string
  secao_8_declaracoes: string
  aceite_lgpd: boolean
  created: string
  updated: string
}

export interface DocumentosAnexos {
  id: string
  confirmacao_id: string
  tipo: 'RG' | 'CPF' | 'PERFIL'
  arquivo: string
  created: string
  updated: string
}

export interface Presenca {
  id: string
  user_id: string
  data_aula: string
  presente: boolean
  justificativa?: string
  created: string
  updated: string
}

export interface Mural {
  id: string
  titulo: string
  conteudo: string
  data_publicacao: string
  turma?: string
  created: string
  updated: string
}

export interface CalendarioAula {
  id: string
  turma: string
  data_aula: string
  created: string
  updated: string
}

export interface DashboardData {
  nome: string
  turma: string
  totalAulas: number
  aulasAssistidas: number
  percentualFrequencia: number
  avisos: Mural[]
}
