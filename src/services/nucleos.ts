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
  /** Zonas territoriais configuradas para priorizar candidatas deste núcleo. */
  zonas_prioritarias?: ZonaPrioritaria[]
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
  capacidade?: number | null
  vagas_disponiveis?: number | null
  lotado: boolean
}

export interface ZonaPrioritaria {
  id: string
  nome: string
  cidade: string
  estado: string
  ponto_entrada?: string | null
  ponto_saida?: string | null
  bairros: string[]
  criado_por?: string | null
  criado_por_nome?: string | null
  atualizado_por?: string | null
  atualizado_por_nome?: string | null
  created: string
  updated: string
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

/** Horário de uma turma aberta, como a candidata vê na inscrição. */
export interface HorarioPublico {
  inicio: string
  fim: string
  /** Turno da turma; vai junto no envio para a gestão casar a aluna com a turma. */
  turno: string
  /** "08:00 às 10:00" — é este texto que a candidata escolhe. */
  label: string
  dias?: string | null
}

/** Núcleo na tela pública de inscrição: só o que a candidata precisa para escolher. */
export interface NucleoPublico {
  codigo: string
  nome: string
  /** Horários com turma aberta neste núcleo. */
  horarios: HorarioPublico[]
  /** Areas que autorizam a inscricao neste nucleo; vazio significa sem restricao configurada. */
  zonas_prioritarias?: Array<Pick<ZonaPrioritaria, 'nome' | 'cidade' | 'estado' | 'bairros'>>
  /** Se o projeto deste núcleo oferece Espaço Kids. */
  espaco_kids?: boolean
}

export const getNucleosPublicos = () => api.get<NucleoPublico[]>('/api/nucleos/publicos')

export const getNucleos = () => api.get<Nucleo[]>('/api/nucleos')
export const getNucleo = (id: string) => api.get<Nucleo>(`/api/nucleos/${id}`)
export const getNucleosResumo = () => api.get<NucleoResumo[]>('/api/nucleos/resumo')
export const getEquipeNucleo = (id: string) => api.get<MembroNucleo[]>(`/api/nucleos/${id}/equipe`)
export const getAlunasNucleo = (id: string) => api.get<AlunaNucleo[]>(`/api/nucleos/${id}/alunas`)
export const criarNucleo = (data: Partial<Nucleo>) => api.post<Nucleo>('/api/nucleos', data)

export const editarNucleo = (id: string, data: Partial<Nucleo>) =>
  api.put<Nucleo>(`/api/nucleos/${id}`, data)

export const getZonasPrioritarias = () => api.get<ZonaPrioritaria[]>('/api/zonas-prioritarias')

export const criarZonaPrioritaria = (
  data: Pick<ZonaPrioritaria, 'nome' | 'cidade' | 'estado' | 'ponto_entrada' | 'ponto_saida' | 'bairros'>,
) => api.post<ZonaPrioritaria>('/api/zonas-prioritarias', data)

export const editarZonaPrioritaria = (
  zonaId: string,
  data: Pick<ZonaPrioritaria, 'nome' | 'cidade' | 'estado' | 'ponto_entrada' | 'ponto_saida' | 'bairros'>,
) => api.put<ZonaPrioritaria>(`/api/zonas-prioritarias/${zonaId}`, data)

export const excluirZonaPrioritaria = (zonaId: string) =>
  api.delete<void>(`/api/zonas-prioritarias/${zonaId}`)

export const vincularZonaAoNucleo = (zonaId: string, nucleoId: string) =>
  api.post<void>(`/api/zonas-prioritarias/${zonaId}/nucleos/${nucleoId}`)

export const desvincularZonaDoNucleo = (zonaId: string, nucleoId: string) =>
  api.delete<void>(`/api/zonas-prioritarias/${zonaId}/nucleos/${nucleoId}`)

/** Resultado do vínculo em lote: quem entrou, quem já estava e quem foi recusado (e por quê). */
export interface VinculoEmLote {
  turma_id: string
  adicionados: string[]
  ja_vinculados: string[]
  recusados: { user_id: string; nome?: string; motivo: string }[]
}

/**
 * Vincula vários profissionais de uma vez. O vínculo em si continua sendo com a turma — é ele que
 * dá as permissões —, então todos os selecionados entram na mesma turma com o mesmo papel.
 */
export const vincularProfissionaisAoNucleo = (
  nucleoId: string,
  profissionaisIds: string[],
  turmaId: string,
  tipoProfissional: string,
) =>
  api.post<VinculoEmLote>(`/api/nucleos/${nucleoId}/profissionais`, {
    profissionais_ids: profissionaisIds,
    turma_id: turmaId,
    tipo_profissional: tipoProfissional,
  })
export const excluirNucleo = (id: string, senha: string) =>
  api.delete<void>(`/api/nucleos/${id}`, { senha })
