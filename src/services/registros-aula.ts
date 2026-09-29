import api, { downloadFile } from '@/lib/api/client'

export type TipoRegistroAula = 'EVIDENCIA' | 'FEEDBACK'

export interface FotoRegistroAula {
  id: string
  arquivo: string
  nome_original?: string | null
}

export interface RegistroAula {
  id: string
  tipo: TipoRegistroAula
  profissional_id: string
  profissional_nome: string
  turma_id: string
  turma_nome: string
  nucleo_id?: string | null
  nucleo_nome: string
  data_aula: string
  relatorio?: string | null
  observacoes?: string | null
  created: string
  fotos: FotoRegistroAula[]
}

export const getRegistrosAula = (tipo: TipoRegistroAula) =>
  api.get<RegistroAula[]>(`/api/registros-aula?tipo=${tipo}`)

export const criarRegistroAula = (form: FormData) =>
  api.postForm<RegistroAula>('/api/registros-aula', form)

export interface FiltroExportacao {
  formato: 'docx' | 'pdf'
  tipo?: TipoRegistroAula
  projeto_id?: string
  nucleo_id?: string
  turma_id?: string
  de?: string
  ate?: string
}

/** Baixa as evidências no formato escolhido, já com o nome de arquivo padronizado pelo backend. */
export const exportarEvidencias = async (filtro: FiltroExportacao) => {
  const params = new URLSearchParams({ formato: filtro.formato, tipo: filtro.tipo ?? 'EVIDENCIA' })
  if (filtro.projeto_id) params.set('projeto_id', filtro.projeto_id)
  if (filtro.nucleo_id) params.set('nucleo_id', filtro.nucleo_id)
  if (filtro.turma_id) params.set('turma_id', filtro.turma_id)
  if (filtro.de) params.set('de', filtro.de)
  if (filtro.ate) params.set('ate', filtro.ate)

  const { blob, filename } = await downloadFile(`/api/registros-aula/exportar?${params.toString()}`)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return filename
}
