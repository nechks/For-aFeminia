import pb from '@/lib/pocketbase/client'
import { DashboardData } from '@/lib/types'

export const getDashboardForcaFeminina = async (): Promise<DashboardData> => {
  return await pb.send('/backend/v1/dashboard/forca-feminina', { method: 'GET' })
}
