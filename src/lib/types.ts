export type PerfilUsuario =
  | 'ALUNA_FF'
  | 'PROFESSOR'
  | 'ASSISTENTE_SOCIAL'
  | 'ADMINISTRATIVO'
  | 'GESTAO_GERAL'
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
  nomeSocial?: string
  email: string
  perfil: PerfilUsuario
  turma?: string
  projeto_id?: string
  nucleo_id?: string
  turma_id?: string
  tipo_profissional?: string
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
  email?: string
  endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  /** Código do núcleo escolhido na inscrição (nome legado do campo). */
  turma?: string
  /** Turma concreta em que a aluna foi alocada; vazio até a gestão alocar. */
  turma_id?: string
  /** Período pedido na inscrição (MANHA/TARDE/NOITE); orienta a alocação na aprovação. */
  periodo_preferido?: string
  /** Horário concreto escolhido na inscrição ("08:00 às 10:00"). */
  horario_preferido?: string
  // Perfil da candidata, coletado na inscrição — é o que a gestão analisa antes de aprovar.
  genero?: string
  orientacao_sexual?: string
  cor_raca?: string
  pcd?: string
  tipos_deficiencia?: string
  deficiencia_outro?: string
  tem_filhos?: string
  ja_foi_aluna?: string
  filho_aluno_taekwondo?: string
  possui_cadunico?: string
  recebe_beneficio_social?: string
  beneficios_sociais?: string
  beneficio_outro?: string
  /** Dado sensível: só gestão e Assistente Social devem exibir. */
  historico_violencia?: string
  tipos_violencia?: string
  medida_protetiva?: string
  /** 10 pontos por critério atendido e 5 por critério não atendido; total de 50 a 100. */
  pontuacao_prioridade?: number
  criterios_prioridade?: string[]
  criterios_nao_atendidos?: string[]
  zona_residencia?: string
  motivo_participar?: string
  como_conheceu?: string
  como_conheceu_outro?: string
  // Espaço Kids: preenchido só quando o projeto do núcleo oferece o espaço.
  espaco_kids_solicitado?: string
  crianca_nome?: string
  crianca_data_nascimento?: string
  crianca_necessidades_especiais?: string
  crianca_necessidades_descricao?: string
  crianca_restricao_alimentar?: string
  crianca_restricao_descricao?: string
  crianca_problema_saude?: string
  crianca_problema_saude_descricao?: string
  crianca_medicamento?: string
  crianca_medicamento_qual?: string
  status: StatusInscricao
  aceite_lgpd: boolean
  data_primeira_aula?: string
  data_primeira_aula_definida_por_nome?: string
  data_primeira_aula_definida_em?: string
  motivo_cancelamento?: string
  /** Acesso do vínculo. Vai a falso quando o projeto é finalizado e volta com a nova ficha. */
  acesso_ativo?: boolean
  ciclo_id?: string
  /** Decisão da vaga da criança de 5 a 12 anos, independente da aprovação da aluna. */
  vaga_crianca_status?: 'APROVADA' | 'NAO_APROVADA'
  vaga_crianca_justificativa?: string
  vaga_crianca_decidido_por_nome?: string
  vaga_crianca_decidido_em?: string
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
  tipo: 'RG' | 'CPF' | 'PERFIL' | 'COMPROVANTE_RESIDENCIA'
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
  /** Última data em que o aviso aparece no painel da aluna; vazio = só o dia da publicação. */
  exibir_ate?: string
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

export type AtendimentoTipo = 'INDIVIDUAL' | 'GRUPAL' | 'FAMILIAR' | 'ENCAMINHAMENTO'

export interface Atendimento {
  id: string
  aluna_id: string
  profissional_id: string
  turma: string
  data_atendimento: string
  tipo: AtendimentoTipo
  descricao: string
  encaminhamento?: string
  created: string
  updated: string
  expand?: {
    aluna_id?: Usuario
    profissional_id?: Usuario
  }
}

export interface DashboardData {
  nome: string
  turma: string
  totalAulas: number
  aulasAssistidas: number
  percentualFrequencia: number
  avisos: Mural[]
}
