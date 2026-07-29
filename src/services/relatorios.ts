import api, { authStore } from '@/lib/api/client'
import {
  Atendimento,
  DocumentosAnexos,
  FichaConfirmacaoFF,
  FichaInscricaoFF,
  Presenca,
  Usuario,
} from '@/lib/types'

/** Filtros da sub-aba Atendimentos da aba Relatórios (exclusiva da Gestão Geral). */
export interface FiltrosAtendimentos {
  turma?: string
  busca?: string
  inicio?: string
  fim?: string
  tipo?: string
}

export interface AlunaRelatorio {
  user_id: string
  inscricao_id: string
  nome_completo: string
  cpf: string
  turma?: string
}

export interface EventoAluna {
  id: string
  evento_id: string
  titulo: string
  data_evento?: string
  respostas: string
  presente: boolean | null
}

export interface FichaConsolidada {
  usuario: Usuario | null
  inscricao: FichaInscricaoFF
  confirmacao: FichaConfirmacaoFF | null
  documentos: DocumentosAnexos[]
  frequencia: {
    total_aulas: number
    presencas: number
    faltas: number
    registros: Presenca[]
  }
  atendimentos: Atendimento[]
  eventos: EventoAluna[]
}

const queryFiltros = (filtros: FiltrosAtendimentos): string => {
  const params = new URLSearchParams()
  if (filtros.turma) params.set('turma', filtros.turma)
  if (filtros.busca) params.set('busca', filtros.busca)
  if (filtros.inicio) params.set('inicio', filtros.inicio)
  if (filtros.fim) params.set('fim', filtros.fim)
  if (filtros.tipo && filtros.tipo !== 'TODOS') params.set('tipo', filtros.tipo)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** Lista de atendimentos para relatório — confidenciais vêm com relatorio = null (mascarado). */
export const getRelatorioAtendimentos = async (
  filtros: FiltrosAtendimentos,
): Promise<Atendimento[]> => {
  return api.get<Atendimento[]>(`/api/relatorios/atendimentos${queryFiltros(filtros)}`)
}

/**
 * Libera o conteúdo de UM atendimento confidencial mediante e-mail e senha de quem o criou
 * (controle duplo — não é a senha da Gestão logada).
 */
export const gerarRelatorioConfidencial = async (
  atendimentoId: string,
  email: string,
  senha: string,
): Promise<Atendimento> => {
  return api.post<Atendimento>(`/api/atendimentos/${atendimentoId}/relatorio/confidencial`, {
    email,
    senha,
  })
}

/** Busca de alunas aprovadas por núcleo + nome/CPF. */
export const buscarAlunas = async (
  turma: string,
  busca?: string,
): Promise<AlunaRelatorio[]> => {
  const params = new URLSearchParams({ turma })
  if (busca) params.set('busca', busca)
  return api.get<AlunaRelatorio[]>(`/api/relatorios/alunas?${params.toString()}`)
}

/** Ficha consolidada da aluna (cadastro, confirmação, frequência, atendimentos, eventos). */
export const getFichaConsolidada = async (userId: string): Promise<FichaConsolidada> => {
  return api.get<FichaConsolidada>(`/api/relatorios/alunas/${userId}`)
}

/** Baixa a planilha Excel dos atendimentos filtrados (confidenciais saem mascarados). */
export const exportarAtendimentosExcel = async (
  filtros: FiltrosAtendimentos,
): Promise<void> => {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'
  const res = await fetch(`${base}/api/relatorios/atendimentos/export${queryFiltros(filtros)}`, {
    headers: { Authorization: `Bearer ${authStore.token}` },
  })
  if (!res.ok) throw new Error('Erro ao exportar a planilha.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_atendimentos_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface ColunaNucleo { chave: string; rotulo: string }
export interface DadosNucleo { colunas: ColunaNucleo[]; linhas: Record<string, string | number>[] }

const parametrosNucleo = (turma: string, campos: string[], inicio: string, termino: string) => {
  const params = new URLSearchParams({ turma })
  campos.forEach((campo) => params.append('campos', campo))
  if (inicio) params.set('inicioProjeto', inicio)
  if (termino) params.set('terminoProjeto', termino)
  return params.toString()
}

export const getDadosNucleo = (turma: string, campos: string[], inicio: string, termino: string) =>
  api.get<DadosNucleo>(`/api/relatorios/nucleo?${parametrosNucleo(turma, campos, inicio, termino)}`)

export const exportarDadosNucleo = async (turma: string, campos: string[], inicio: string, termino: string) => {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'
  const res = await fetch(`${base}/api/relatorios/nucleo/export?${parametrosNucleo(turma, campos, inicio, termino)}`, { headers: { Authorization: `Bearer ${authStore.token}` } })
  if (!res.ok) throw new Error('Erro ao exportar os dados do núcleo.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dados_nucleo_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
