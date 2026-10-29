import api from '@/lib/api/client'

export type StatusProjeto = 'ATIVO' | 'FINALIZADO' | 'EM_ESPERA'

export interface Projeto {
  id: string
  codigo: string
  nome: string
  patrocinador: string
  capacidadeAlunas: number
  dataInicio: string
  dataTermino: string
  descricao?: string
  status: StatusProjeto
  /** Nem todo projeto tem Espaço Kids; quando não tem, a inscrição nem pergunta. */
  espaco_kids?: boolean
  /** Espelho de `status === 'ATIVO'`, mantido para as telas que já perguntavam só isso. */
  ativo: boolean
  atualizadoEm?: string
  atualizadoPorNome?: string
}

export interface ProjetoPayload {
  nome: string
  patrocinador: string
  capacidadeAlunas: number
  dataInicio: string
  dataTermino: string
  descricao?: string
  status?: StatusProjeto
  espaco_kids?: boolean
  /** Profissionais que atuam no projeto. O vínculo é N:N e vive aqui, não na aprovação. */
  profissionais_ids?: string[]
}

export interface ProfissionalDoProjeto {
  user_id: string
  nome: string
  email: string
  perfil: string
}

/** Aluna do projeto na tela de Renovar Ciclo. */
export interface AlunaDoProjeto {
  inscricao_id: string
  user_id: string
  nome_completo: string
  nucleo_codigo?: string | null
  status_inscricao?: string | null
  acesso_ativo: boolean
  renovacao_status: 'NAO_ENVIADA' | 'ENVIADA' | 'RESPONDIDA'
  renovacao_enviada_em?: string | null
}

export const statusProjetoInfo: Record<StatusProjeto, { label: string; color: string }> = {
  ATIVO: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  EM_ESPERA: { label: 'Em espera', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  FINALIZADO: { label: 'Finalizado', color: 'bg-slate-200 text-slate-700 hover:bg-slate-200' },
}

export const getStatusProjetoInfo = (status: string | undefined) =>
  statusProjetoInfo[status as StatusProjeto] ?? {
    label: status ?? '—',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  }

export const getProjetos = (status?: string) =>
  api.get<Projeto[]>(
    status && status !== 'ALL'
      ? `/api/projetos?status=${encodeURIComponent(status)}`
      : '/api/projetos',
  )

export const criarProjeto = (data: ProjetoPayload) => api.post<Projeto>('/api/projetos', data)

export const editarProjeto = (id: string, data: ProjetoPayload) =>
  api.put<Projeto>(`/api/projetos/${id}`, data)

export const getProfissionaisDoProjeto = (id: string) =>
  api.get<ProfissionalDoProjeto[]>(`/api/projetos/${id}/profissionais`)

export const definirProfissionaisDoProjeto = (id: string, profissionaisIds: string[]) =>
  api.put<ProfissionalDoProjeto[]>(`/api/projetos/${id}/profissionais`, {
    profissionais_ids: profissionaisIds,
  })

export const getAlunasDoProjeto = (id: string) =>
  api.get<AlunaDoProjeto[]>(`/api/projetos/${id}/alunas`)

export const renovarCiclo = (id: string, alunasIds: string[]) =>
  api.post<{ renovadas: number; alunas_ids: string[] }>(`/api/projetos/${id}/renovar-ciclo`, {
    alunas_ids: alunasIds,
  })
