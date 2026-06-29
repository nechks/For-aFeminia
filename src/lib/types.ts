export type PerfilUsuario = 'ALUNA_FF' | 'PROFESSOR' | 'ASSISTENTE_SOCIAL' | 'ADMIN' | 'GESTAO'
export type StatusInscricao = 'AGUARDANDO' | 'APROVADA' | 'LISTA_ESPERA' | 'CANCELADA'
export type TurmaFF =
  | 'CENTRO_VITORIA'
  | 'AEST_SERRA'
  | 'ITAQUARI_CARIACICA'
  | 'CONJUNTO_CARAPINA_SERRA'
  | 'ATLANTICA_VILLE_VITORIA'

export interface Usuario {
  id: string
  nomeCompleto: string
  email: string
  perfil: PerfilUsuario
  ativo: boolean
}

export interface FichaInscricaoFF {
  id: string
  usuarioId?: string
  turma: TurmaFF
  nomeCompleto: string
  dataNascimento: string
  cpf: string
  telefone: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  autorizaLgpd: boolean
  status: StatusInscricao
  dataPrimeiraAula?: string
  dataCriacao: string
  fichaConfirmacaoPreenchida?: boolean
}

export interface Presenca {
  id: string
  alunaId: string
  turma: TurmaFF
  dataAula: string
  presente: boolean
}
