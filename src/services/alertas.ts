import api from '@/lib/api/client'

export interface Alerta {
  id: string
  aluna_id: string
  aluna_nome: string
  turma: string
  tipo: string
  faltas_sem_justificativa: number
  datas: string
  status: 'ABERTO' | 'RESOLVIDO'
  resolvido_por?: string
  created: string
  updated: string
}

export const getAlertas = async (): Promise<Alerta[]> => {
  return api.get<Alerta[]>('/api/alertas')
}

export const resolverAlerta = async (id: string): Promise<Alerta> => {
  return api.patch<Alerta>(`/api/alertas/${id}/resolver`)
}
