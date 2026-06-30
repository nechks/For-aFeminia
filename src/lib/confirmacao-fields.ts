export type FieldType = 'text' | 'date' | 'select' | 'textarea' | 'radio' | 'checkbox'

export interface FormField {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  prefillKey?: string
  readonly?: boolean
}

export interface FormSection {
  id: number
  title: string
  description?: string
  confidential?: boolean
  storageKey: string
  fields: FormField[]
}

export const formSections: FormSection[] = [
  {
    id: 1,
    title: 'Dados Pessoais',
    storageKey: 'secao_1_dados',
    fields: [
      {
        name: 'nome_completo',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        prefillKey: 'nome_completo',
        readonly: true,
      },
      {
        name: 'data_nascimento',
        label: 'Data de Nascimento',
        type: 'date',
        required: true,
        prefillKey: 'data_nascimento',
        readonly: true,
      },
      {
        name: 'cpf',
        label: 'CPF',
        type: 'text',
        required: true,
        prefillKey: 'cpf',
        readonly: true,
      },
      { name: 'rg', label: 'RG', type: 'text', prefillKey: 'rg', readonly: true },
      {
        name: 'telefone',
        label: 'Telefone (WhatsApp)',
        type: 'text',
        required: true,
        prefillKey: 'telefone',
      },
      {
        name: 'email',
        label: 'E-mail',
        type: 'text',
        required: true,
        placeholder: 'exemplo@email.com',
      },
      {
        name: 'estado_civil',
        label: 'Estado Civil',
        type: 'select',
        required: true,
        options: ['Solteira', 'Casada', 'Divorciada', 'Viuva', 'Uniao Estavel'],
      },
      {
        name: 'naturalidade',
        label: 'Naturalidade',
        type: 'text',
        required: true,
        placeholder: 'Cidade/UF',
      },
    ],
  },
  {
    id: 2,
    title: 'Endereco',
    storageKey: 'secao_2_dados',
    fields: [
      { name: 'cep', label: 'CEP', type: 'text', required: true, prefillKey: 'cep' },
      { name: 'endereco', label: 'Endereco', type: 'text', required: true, prefillKey: 'endereco' },
      { name: 'numero', label: 'Numero', type: 'text', required: true },
      { name: 'bairro', label: 'Bairro', type: 'text', required: true, prefillKey: 'bairro' },
      { name: 'cidade', label: 'Cidade', type: 'text', required: true, prefillKey: 'cidade' },
      { name: 'estado', label: 'Estado', type: 'text', required: true, prefillKey: 'estado' },
    ],
  },
  {
    id: 3,
    title: 'Dados Profissionais',
    storageKey: 'secao_3_dados',
    fields: [
      { name: 'profissao', label: 'Profissao', type: 'text' },
      {
        name: 'situacao_trabalho',
        label: 'Situacao de Trabalho',
        type: 'select',
        options: [
          'Desempregada',
          'Trabalho Informal',
          'CLT',
          'Autonoma',
          'Aposentada',
          'Estudante',
        ],
      },
      {
        name: 'renda_familiar',
        label: 'Renda Familiar Per Capita',
        type: 'select',
        options: ['Ate 1/2 SM', '1/2 a 1 SM', '1 a 2 SM', '2 a 3 SM', 'Mais de 3 SM'],
      },
      {
        name: 'pessoas_residencia',
        label: 'Pessoas na Residencia',
        type: 'text',
        placeholder: 'Ex: 4',
      },
      {
        name: 'escolaridade',
        label: 'Escolaridade',
        type: 'select',
        options: [
          'Fundamental Incompleto',
          'Fundamental Completo',
          'Medio Incompleto',
          'Medio Completo',
          'Superior Incompleto',
          'Superior Completo',
          'Pos-graduacao',
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Saude',
    storageKey: 'secao_4_dados',
    fields: [
      {
        name: 'comorbidades',
        label: 'Possui comorbidades ou restricoes fisicas?',
        type: 'textarea',
        placeholder: 'Ex: Asma, problemas articulares...',
      },
      {
        name: 'medicacao_continua',
        label: 'Faz uso continuo de medicacao?',
        type: 'radio',
        options: ['Sim', 'Nao'],
      },
      { name: 'quais_medicacoes', label: 'Quais medicamentos?', type: 'text' },
      { name: 'alergias', label: 'Possui alergias?', type: 'textarea' },
      {
        name: 'cirurgias_recentes',
        label: 'Cirurgias recentes (ultimos 6 meses)?',
        type: 'radio',
        options: ['Sim', 'Nao'],
      },
      {
        name: 'contato_emergencia',
        label: 'Contato de Emergencia',
        type: 'text',
        required: true,
        placeholder: '(27) 99999-9999',
      },
    ],
  },
  {
    id: 5,
    title: 'Uniforme e Turma',
    storageKey: 'secao_5_dados',
    fields: [
      {
        name: 'turma',
        label: 'Turma Selecionada',
        type: 'text',
        required: true,
        prefillKey: 'turma',
        readonly: true,
      },
      {
        name: 'tamanho_camisa',
        label: 'Tamanho da Camisa',
        type: 'select',
        required: true,
        options: ['PP', 'P', 'M', 'G', 'GG', 'XG'],
      },
      {
        name: 'tamanho_calca',
        label: 'Tamanho da Calca',
        type: 'select',
        required: true,
        options: ['36', '38', '40', '42', '44', '46', '48'],
      },
      { name: 'tamanho_calcado', label: 'Tamanho do Calcado', type: 'text', required: true },
      { name: 'data_primeira_aula', label: 'Data da Primeira Aula', type: 'date' },
    ],
  },
  {
    id: 6,
    title: 'Perfil Socioeconomico',
    storageKey: 'secao_6_socioeconomico',
    confidential: true,
    description: 'Dados confidenciais acessiveis apenas a Assistente Social e Coordenacao.',
    fields: [
      {
        name: 'tipo_moradia',
        label: 'Tipo de Moradia',
        type: 'select',
        options: ['Propria', 'Alugada', 'Cedida', 'Ocupacao', 'Financiada'],
      },
      {
        name: 'situacao_moradia',
        label: 'Situacao da Moradia',
        type: 'select',
        options: ['Boa', 'Regular', 'Precaria'],
      },
      {
        name: 'possui_agua',
        label: 'Possui agua encanada?',
        type: 'radio',
        options: ['Sim', 'Nao'],
      },
      {
        name: 'possui_luz',
        label: 'Possui energia eletrica?',
        type: 'radio',
        options: ['Sim', 'Nao'],
      },
      {
        name: 'possui_esgoto',
        label: 'Possui esgoto sanitario?',
        type: 'radio',
        options: ['Sim', 'Nao'],
      },
      {
        name: 'bens_familia',
        label: 'Bens da Familia',
        type: 'textarea',
        placeholder: 'Geladeira, fogao, maquina de lavar...',
      },
      {
        name: 'programas_sociais',
        label: 'Participa de programas sociais?',
        type: 'textarea',
        placeholder: 'Bolsa Familia, Minha Casa Minha Vida...',
      },
    ],
  },
  {
    id: 7,
    title: 'Historico de Violencia',
    storageKey: 'secao_7_violencia',
    confidential: true,
    description: 'Informacoes sensiveis. Acesso restrito a Assistente Social e Coordenacao.',
    fields: [
      {
        name: 'situacao_violencia',
        label: 'Ja passou por situacao de violencia?',
        type: 'radio',
        options: ['Sim', 'Nao', 'Prefiro nao responder'],
      },
      {
        name: 'tipo_violencia',
        label: 'Tipo de Violencia',
        type: 'select',
        options: ['Fisica', 'Psicologica', 'Sexual', 'Patrimonial', 'Moral', 'Nenhuma'],
      },
      {
        name: 'denuncio',
        label: 'Realizou boletim de ocorrencia?',
        type: 'radio',
        options: ['Sim', 'Nao', 'Nao se aplica'],
      },
      {
        name: 'apoio_familiar',
        label: 'Possui apoio familiar?',
        type: 'radio',
        options: ['Sim', 'Nao', 'Parcial'],
      },
      { name: 'observacoes', label: 'Observacoes', type: 'textarea' },
    ],
  },
  {
    id: 8,
    title: 'Declaracoes Finais',
    storageKey: 'secao_8_declaracoes',
    description: 'Termos e consentimentos necessarios para finalizacao.',
    fields: [
      {
        name: 'compromisso_frequencia',
        label:
          'Estou ciente da carga horaria e me comprometo a ter no minimo 75% de frequencia para manter a vaga e receber o certificado.',
        type: 'checkbox',
        required: true,
      },
      {
        name: 'veracidade_informacoes',
        label:
          'Confirmo a veracidade de todas as informacoes prestadas neste formulario sob as penas da lei.',
        type: 'checkbox',
        required: true,
      },
      {
        name: 'termos_imagem',
        label: 'Autorizo o uso de minha imagem para fins institucionais e divulgacao do projeto.',
        type: 'checkbox',
        required: true,
      },
      {
        name: 'aceite_lgpd',
        label: 'Li e aceito os termos da LGPD para tratamento dos meus dados pessoais.',
        type: 'checkbox',
        required: true,
      },
      { name: 'observacoes_finais', label: 'Observacoes Finais (opcional)', type: 'textarea' },
    ],
  },
]
