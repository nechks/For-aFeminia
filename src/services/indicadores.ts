import pb from '@/lib/pocketbase/client'

export interface IndicadoresData {
  totalStudents: number
  totalInscricoes: number
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
  return pb.send('/backend/v1/indicadores/dashboard', { method: 'GET' })
}
