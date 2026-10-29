// Opções da Ficha Cadastral da Equipe (formulário oficial), reaproveitadas no cadastro de professor.

export const nacionalidadeOptions = ['Brasileira', 'Estrangeira']

export const estadoCivilOptions = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Separado(a) judicialmente',
  'Viúvo(a)',
  'Em união estável',
]

export const vinculoContratualOptions = [
  'PJ (Pessoa Jurídica)',
  'Autônomo (Pessoa Física)',
  'Estágio',
  'Outro',
]

export const tamanhoCamisaOptions = ['Babylook', 'P', 'PP', 'M', 'G', 'GG', 'XG', '2G', '3G']

export const projetoContratanteOptions = [
  { value: 'FFF', label: 'Força Feminina Federal' },
  { value: 'FFA', label: 'Força Feminina ArcelorMittal' },
  { value: 'FFE', label: 'Força Feminina Estadual' },
  { value: 'ETKD', label: 'Escola de Taekwondo' },
]

// Cada projeto contratante abre a sua própria lista de serviços (lógica condicional do formulário).
export const servicoPorProjeto: Record<string, string[]> = {
  ETKD: [
    'Assessoria de Imprensa',
    'Assessoria em Prestação de Contas',
    'Assistente Social',
    'Auxiliar Administrativo',
    'Coordenador Técnico',
    'Gerente Geral',
    'Monitor',
    'Professor',
    'Serviços de Criação de Layouts',
    'Fornecedor(a) de Kit Lanche',
  ],
  FFF: [
    'Assessoria Contábil',
    'Assessoria de Comunicação',
    'Assessoria em Prestação de Contas',
    'Assistente Administrativo',
    'Assistente Social',
    'Gerente Geral',
    'Professor',
    'Mediador de Roda de Conversa',
    'Monitor',
    'Psicólogo',
    'Serviços de Criação de Layouts',
    'Monitor de criança',
    'Fornecedor(a) de Kit Lanche',
  ],
  FFE: [
    'Assistente Social',
    'Auxiliar',
    'Auxiliar Administrativo',
    'Coordenador Geral',
    'Design Gráfico',
    'Gestão e Prestação de Contas',
    'Mediador de Roda de Conversa',
    'Professor',
    'Coordenador Técnico',
    'Fornecedor(a) de Kit Lanche',
  ],
  FFA: [
    'Assistente Social',
    'Auxiliar de Defesa Pessoal',
    'Auxiliar Administrativo',
    'Coordenador Geral',
    'Design Gráfico',
    'Gestão e Prestação de Contas',
    'Mediador de Roda de Conversa',
    'Professor',
    'Coordenador Técnico',
    'Gestão de Mídias Sociais',
    'Fornecedor(a) de Kit Lanche',
  ],
}

export const projetoLabel = (value: string): string =>
  projetoContratanteOptions.find((p) => p.value === value)?.label ?? value

// Rótulos legíveis dos documentos anexados (usado na tela de solicitações).
export const documentoLabels: Record<string, string> = {
  rg_cpf_cnh: 'RG e CPF ou CNH',
  comprovante_residencia: 'Comprovante de residência',
  curriculo: 'Currículo',
  cartao_cnpj: 'Cartão CNPJ',
  registro_conselho: 'Registro no conselho profissional',
  contrato_social: 'Contrato social da empresa',
}

// Rótulos legíveis dos campos de texto/seleção (usado na tela de solicitações).
export const campoLabels: Record<string, string> = {
  perfil: 'Tipo de profissional',
  nome_completo: 'Nome completo',
  telefone: 'Telefone',
  cpf: 'CPF',
  data_nascimento: 'Data de nascimento',
  rg: 'RG',
  nome_empresa: 'Nome da empresa/MEI',
  cnpj: 'CNPJ',
  nacionalidade: 'Nacionalidade',
  estado_civil: 'Estado civil',
  profissao: 'Profissão',
  endereco_residencial: 'Endereço residencial',
  endereco_comercial: 'Endereço comercial',
  tamanho_camisa: 'Tamanho da camisa',
  dados_bancarios: 'Dados bancários',
  vinculo_contratual: 'Vínculo contratual',
  vinculo_contratual_outro: 'Vínculo (outro)',
  projeto_contratante: 'Projeto contratante',
  servico_prestado: 'Serviço prestado',
  email: 'E-mail',
}
