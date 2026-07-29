export type FieldType =
  | 'text'
  | 'date'
  | 'select'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'multi-select-add'
  | 'children'
  | 'profession'

export interface FormField {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  prefillKey?: string
  readonly?: boolean
  showWhen?: { field: string; equals: string }
  hideWhen?: { field: string; equals: string }
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
    title: 'Dados pessoais',
    storageKey: 'secao_1_dados',
    fields: [
      {
        name: 'nome_completo',
        label: 'Nome completo',
        type: 'text',
        required: true,
        prefillKey: 'nome_completo',
        readonly: true,
      },
      {
        name: 'data_nascimento',
        label: 'Data de nascimento',
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
        label: 'Estado civil',
        type: 'select',
        required: true,
        options: ['Solteira', 'Casada', 'Divorciada', 'Viúva', 'União estável'],
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
    title: 'Endereço',
    storageKey: 'secao_2_dados',
    fields: [
      { name: 'cep', label: 'CEP', type: 'text', required: true, prefillKey: 'cep' },
      { name: 'endereco', label: 'Endereço', type: 'text', required: true, prefillKey: 'endereco' },
      { name: 'numero', label: 'Número', type: 'text', required: true },
      { name: 'bairro', label: 'Bairro', type: 'text', required: true, prefillKey: 'bairro' },
      { name: 'cidade', label: 'Cidade', type: 'text', required: true, prefillKey: 'cidade' },
      { name: 'estado', label: 'Estado', type: 'text', required: true, prefillKey: 'estado' },
    ],
  },
  {
    id: 3,
    title: 'Dados profissionais',
    storageKey: 'secao_3_dados',
    fields: [
      {
        name: 'situacao_trabalho',
        label: 'Situação de trabalho',
        type: 'select',
        required: true,
        options: [
          'Desempregada',
          'Trabalho informal',
          'CLT',
          'Autônoma',
          'Aposentada',
          'Estudante',
        ],
      },
      {
        name: 'profissao',
        label: 'Profissão (CBO)',
        type: 'profession',
        required: true,
        hideWhen: { field: 'situacao_trabalho', equals: 'Desempregada' },
      },
      {
        name: 'renda_familiar',
        label: 'Renda familiar per capita — salário mínimo de 2026: R$ 1.621,00',
        type: 'select',
        options: [
          'Até R$ 810,50',
          'De R$ 810,51 a R$ 1.621,00',
          'De R$ 1.621,01 a R$ 3.242,00',
          'De R$ 3.242,01 a R$ 4.863,00',
          'Acima de R$ 4.863,00',
        ],
      },
      {
        name: 'pessoas_residencia',
        label: 'Pessoas na residência',
        type: 'text',
        placeholder: 'Ex: 4',
      },
      {
        name: 'escolaridade',
        label: 'Escolaridade',
        type: 'select',
        options: [
          'Fundamental incompleto',
          'Fundamental completo',
          'Médio incompleto',
          'Médio completo',
          'Superior incompleto',
          'Superior completo',
          'Pós-graduação',
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Saúde',
    storageKey: 'secao_4_dados',
    fields: [
      {
        name: 'comorbidades',
        label: 'Possui comorbidades ou restrições físicas?',
        type: 'textarea',
        placeholder: 'Ex: Asma, problemas articulares...',
      },
      {
        name: 'medicacao_continua',
        label: 'Faz uso contínuo de medicação?',
        type: 'radio',
        options: ['Sim', 'Não'],
      },
      { name: 'quais_medicacoes', label: 'Quais medicamentos?', type: 'text' },
      { name: 'alergias', label: 'Possui alergias?', type: 'textarea' },
      {
        name: 'cirurgias_recentes',
        label: 'Cirurgias recentes (últimos 6 meses)?',
        type: 'radio',
        options: ['Sim', 'Não'],
      },
      {
        name: 'contato_emergencia',
        label: 'Contato de emergência',
        type: 'text',
        required: true,
        placeholder: '(27) 99999-9999',
      },
    ],
  },
  {
    id: 5,
    title: 'Uniforme e turma',
    storageKey: 'secao_5_dados',
    fields: [
      {
        name: 'turma',
        label: 'Turma selecionada',
        type: 'text',
        required: true,
        prefillKey: 'turma',
        readonly: true,
      },
      {
        name: 'tamanho_camisa',
        label: 'Tamanho da camisa',
        type: 'select',
        required: true,
        options: ['PP', 'P', 'M', 'G', 'GG', 'XG'],
      },
      {
        name: 'tamanho_luva',
        label: 'Tamanho da luva',
        type: 'select',
        required: true,
        options: ['P', 'M', 'G'],
      },
    ],
  },
  {
    id: 6,
    title: 'Perfil socioeconômico',
    storageKey: 'secao_6_socioeconomico',
    confidential: true,
    description: 'Dados confidenciais acessíveis apenas à Assistente Social e à Coordenação.',
    fields: [
      {
        name: 'tipo_moradia',
        label: 'Tipo de moradia',
        type: 'select',
        options: ['Própria', 'Alugada', 'Cedida', 'Ocupação', 'Financiada'],
      },
      {
        name: 'situacao_moradia',
        label: 'Situação da moradia',
        type: 'select',
        options: ['Boa', 'Regular', 'Precária'],
      },
      {
        name: 'possui_agua',
        label: 'Possui água encanada?',
        type: 'radio',
        options: ['Sim', 'Não'],
      },
      {
        name: 'possui_luz',
        label: 'Possui energia elétrica?',
        type: 'radio',
        options: ['Sim', 'Não'],
      },
      {
        name: 'possui_esgoto',
        label: 'Possui esgoto sanitário?',
        type: 'radio',
        options: ['Sim', 'Não'],
      },
      {
        name: 'bens_familia',
        label: 'Bens da família',
        type: 'multi-select-add',
        options: [
          'Geladeira',
          'Fogão',
          'Televisão',
          'Máquina de lavar',
          'Micro-ondas',
          'Computador ou notebook',
          'Celular',
          'Ventilador',
          'Ar-condicionado',
          'Automóvel',
          'Motocicleta',
          'Bicicleta',
        ],
        placeholder: 'Digite outro bem',
      },
      {
        name: 'programas_sociais',
        label: 'Participa de programas sociais?',
        type: 'textarea',
        placeholder: 'Bolsa Família, Minha Casa Minha Vida...',
      },
      {
        name: 'tem_filhos',
        label: 'Você tem filho(s)?',
        type: 'radio',
        options: ['Sim', 'Não'],
        required: true,
      },
      {
        name: 'tem_rede_apoio_filhos',
        label: 'Você tem uma rede de apoio para deixar seu(s) filho(s) durante as atividades?',
        type: 'radio',
        options: ['Sim', 'Não'],
        required: true,
        showWhen: { field: 'tem_filhos', equals: 'Sim' },
      },
      {
        name: 'precisa_levar_filhos',
        label: 'Você precisará levar seu(s) filho(s) para as atividades?',
        type: 'radio',
        options: ['Sim', 'Não'],
        required: true,
        showWhen: { field: 'tem_rede_apoio_filhos', equals: 'Não' },
      },
      {
        name: 'criancas',
        label: 'Dados das crianças',
        type: 'children',
        required: true,
        showWhen: { field: 'precisa_levar_filhos', equals: 'Sim' },
      },
    ],
  },
  {
    id: 7,
    title: 'Histórico de violência',
    storageKey: 'secao_7_violencia',
    confidential: true,
    description: 'Informações sensíveis. Acesso restrito à Assistente Social e à Coordenação.',
    fields: [
      {
        name: 'situacao_violencia',
        label: 'Já passou por situação de violência?',
        type: 'radio',
        options: ['Sim', 'Não', 'Prefiro não responder'],
      },
      {
        name: 'tipo_violencia',
        label: 'Tipo de violência',
        type: 'select',
        options: ['Física', 'Psicológica', 'Sexual', 'Patrimonial', 'Moral', 'Nenhuma'],
      },
      {
        name: 'denuncio',
        label: 'Realizou boletim de ocorrência?',
        type: 'radio',
        options: ['Sim', 'Não', 'Não se aplica'],
      },
      {
        name: 'apoio_familiar',
        label: 'Possui apoio familiar?',
        type: 'radio',
        options: ['Sim', 'Não', 'Parcial'],
      },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  {
    id: 8,
    title: 'Declarações finais',
    storageKey: 'secao_8_declaracoes',
    description: 'Termos e consentimentos necessários para a finalização.',
    fields: [
      {
        name: 'compromisso_frequencia',
        label:
          'Estou ciente da carga horária e me comprometo a ter no mínimo 75% de frequência para manter a vaga e receber o certificado.',
        type: 'checkbox',
        required: true,
      },
      {
        name: 'veracidade_informacoes',
        label:
          'Confirmo a veracidade de todas as informações prestadas neste formulário, sob as penas da lei.',
        type: 'checkbox',
        required: true,
      },
      {
        name: 'termos_imagem',
        label: 'Autorizo o uso de minha imagem para fins institucionais e divulgação do projeto.',
        type: 'checkbox',
        required: true,
      },
      {
        name: 'aceite_lgpd',
        label: 'Li e aceito os termos da LGPD para tratamento dos meus dados pessoais.',
        type: 'checkbox',
        required: true,
      },
      { name: 'observacoes_finais', label: 'Observações finais (opcional)', type: 'textarea' },
    ],
  },
]
