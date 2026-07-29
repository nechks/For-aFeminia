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
  aceite_lgpd: boolean
}

export const submitInscricao = async (data: InscricaoData): Promise<any> => {
  return api.post('/api/inscricao/forca-feminina', data)
}
