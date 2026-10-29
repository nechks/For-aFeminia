import api from '@/lib/api/client'

export interface InscricaoData {
  nome_completo: string
  cpf: string
  rg?: string
  data_nascimento: string
  telefone: string
  email: string
  password: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  turma: string
  /** Perguntas 19 a 24, 34 a 36 e 38 da ficha oficial, coletadas já no cadastro. */
  zona_residencia: string
  genero: string
  orientacao_sexual: string
  orientacao_sexual_outro: string
  cor_raca: string
  pcd: string
  tipos_deficiencia: string[]
  deficiencia_outro: string
  tem_filhos: string
  ja_foi_aluna: string
  filho_aluno_taekwondo: string
  possui_cadunico: string
  motivo_participar: string
  como_conheceu: string
  como_conheceu_outro: string
  recebe_beneficio_social: string
  beneficios_sociais: string[]
  beneficio_outro: string
  historico_violencia: string
  tipos_violencia: string[]
  medida_protetiva: string
  horario_preferido: string
  /** Espaço Kids: só vem preenchido quando o projeto do núcleo oferece o espaço. */
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
  periodo_preferido: string
  aceite_lgpd: boolean
}

export const submitInscricao = async (data: InscricaoData): Promise<any> => {
  return api.post('/api/inscricao/forca-feminina', data)
}
