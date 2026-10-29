import api from '@/lib/api/client'

/** Item da lista: sem nenhum dado sensível. */
export interface AlunaResumo {
  user_id: string
  nome: string
  avatar?: string | null
  turma_id: string
  turma_nome: string
  nucleo_nome: string
}

/** Perfil individual. Cada abertura fica registrada na auditoria do backend. */
export interface AlunaPerfil {
  user_id: string
  nome: string
  nome_completo: string
  avatar?: string | null
  cadastro: {
    data_nascimento?: string | null
    telefone?: string | null
    email?: string | null
    bairro?: string | null
    cidade?: string | null
    turma_nome?: string | null
    nucleo_nome?: string | null
    contato_emergencia?: string | null
  }
  saude: {
    pcd?: string | null
    tipos_deficiencia?: string | null
    comorbidades?: string | null
    medicacao_continua?: string | null
    quais_medicacoes?: string | null
    alergias?: string | null
    cirurgias_recentes?: string | null
    ficha_confirmacao_entregue: boolean
    possui_registro: boolean
  }
  protecao: {
    possui_medida_protetiva: boolean
  }
}

export const getAlunasDoProfissional = (busca?: string) =>
  api.get<AlunaResumo[]>(
    `/api/profissional/alunas${busca?.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : ''}`,
  )

export const getPerfilAluna = (userId: string) =>
  api.get<AlunaPerfil>(`/api/profissional/alunas/${userId}`)
