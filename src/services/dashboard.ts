import api from '@/lib/api/client'
import { DashboardData } from '@/lib/types'

export const getDashboardForcaFeminina = async (): Promise<DashboardData> => {
  return api.get<DashboardData>('/api/dashboard/forca-feminina')
}
