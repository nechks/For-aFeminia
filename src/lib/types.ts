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
