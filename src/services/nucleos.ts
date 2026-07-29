import api from '@/lib/api/client'
export interface Nucleo {
  id: string
  projeto_id?: string
  codigo: string
  nome: string
  endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  telefone?: string
  email?: string
  responsavel?: string
  capacidade?: number
  dias_semana?: string
  turno?: string
  ativo: boolean
}
export const getNucleos = () => api.get<Nucleo[]>('/api/nucleos')
export const criarNucleo = (data: Partial<Nucleo>) => api.post<Nucleo>('/api/nucleos', data)
export const excluirNucleo = (id: string, senha: string) =>
  api.delete<void>(`/api/nucleos/${id}`, { senha })
