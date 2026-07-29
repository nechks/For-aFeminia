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

export const getIndicadores = async (): Promise<IndicadoresData> => {
  return api.get<IndicadoresData>('/api/indicadores/dashboard')
}
