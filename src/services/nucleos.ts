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
/** Contadores por núcleo usados nos cards da listagem. */
export interface NucleoResumo {
  nucleo_id: string
  turmas: number
  equipe: number
  alunas: number
}

/** Um membro da equipe aparece uma vez por turma em que atua dentro do núcleo. */
export interface MembroNucleo {
  id: string
  user_id: string
  nome: string
  email: string
  avatar?: string | null
  turma_id: string
  turma_nome: string
  turma_turno: string
  turma_dias: string
  tipo_profissional: string
}

export interface AlunaNucleo {
  inscricao_id: string
  user_id: string
  nome_completo: string
  turma_id?: string | null
  turma_nome?: string | null
  /** Período pedido na inscrição; usado para alocar na turma certa. */
  periodo_preferido?: string | null
}

/** Núcleo na tela pública de inscrição: só o que a candidata precisa para escolher. */
export interface NucleoPublico {
  codigo: string
  nome: string
  /** Períodos que têm turma aberta neste núcleo. */
  turnos: string[]
}

export const getNucleosPublicos = () => api.get<NucleoPublico[]>('/api/nucleos/publicos')

export const getNucleos = () => api.get<Nucleo[]>('/api/nucleos')
export const getNucleo = (id: string) => api.get<Nucleo>(`/api/nucleos/${id}`)
export const getNucleosResumo = () => api.get<NucleoResumo[]>('/api/nucleos/resumo')
export const getEquipeNucleo = (id: string) => api.get<MembroNucleo[]>(`/api/nucleos/${id}/equipe`)
export const getAlunasNucleo = (id: string) => api.get<AlunaNucleo[]>(`/api/nucleos/${id}/alunas`)
export const criarNucleo = (data: Partial<Nucleo>) => api.post<Nucleo>('/api/nucleos', data)
export const excluirNucleo = (id: string, senha: string) =>
  api.delete<void>(`/api/nucleos/${id}`, { senha })
