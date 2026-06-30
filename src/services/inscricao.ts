import pb from '@/lib/pocketbase/client'

export interface InscricaoData {
  nome_completo: string
  cpf: string
  rg?: string
  data_nascimento: string
  telefone: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  turma: string
  aceite_lgpd: boolean
}

export const submitInscricao = async (data: InscricaoData): Promise<any> => {
  return await pb.send('/backend/v1/inscricao/forca-feminina', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}
