import api from '@/lib/api/client'

export interface Notificacao {
  id: string
  destinatario_id?: string | null
  perfil_destino?: string | null
  tipo: string
  titulo: string
  mensagem: string
  referencia_id?: string | null
  lida: boolean
  lida_em?: string | null
  created: string
}

export interface TemplateMensagem {
  id: string
  chave: string
  titulo: string
  corpo: string
  ativo: boolean
}

export const getNotificacoes = () => api.get<Notificacao[]>('/api/notificacoes')

export const marcarNotificacaoLida = (id: string) =>
  api.patch<Notificacao>(`/api/notificacoes/${id}/lida`)

export const getTemplatesMensagem = () => api.get<TemplateMensagem[]>('/api/templates-mensagem')

export const editarTemplateMensagem = (
  id: string,
  data: { titulo: string; corpo: string; ativo?: boolean },
) => api.put<TemplateMensagem>(`/api/templates-mensagem/${id}`, data)
