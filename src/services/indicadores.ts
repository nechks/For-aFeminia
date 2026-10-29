import api from '@/lib/api/client'

export interface IndicadoresData {
  totalStudents: number
  totalInscricoes: number
  aguardandoAprovacao: number
  listaEspera: number
  dropoutRate: number
  canceladas: number
  statusDistribution: Record<string, number>
  turmaDistribution: Record<string, number>
  socioeconomicDistribution: {
    rendaFamiliar: Record<string, number>
    tipoMoradia: Record<string, number>
  }
}

/** Faltas por turma. Presenças e faltas já vêm em aulas (cada chamada vale 0,5). */
export interface IndicadorTurma {
  turma_id: string
  turma_nome: string
  turno: string
  dias_semana: string
  nucleo_id: string
  nucleo_nome: string
  alunas: number
  presencas: number
  faltas_justificadas: number
  faltas_sem_justificativa: number
}

/** Só os gráficos socioeconômicos (contagens agregadas), também liberados à Assistente Social. */
export const getSocioeconomico = () =>
  api.get<IndicadoresData['socioeconomicDistribution']>('/api/indicadores/socioeconomico')

export const getIndicadores = async (): Promise<IndicadoresData> => {
  return api.get<IndicadoresData>('/api/indicadores/dashboard')
}

export const getIndicadoresPorTurma = async (): Promise<IndicadorTurma[]> => {
  return api.get<IndicadorTurma[]>('/api/indicadores/turmas')
}
