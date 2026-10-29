import api from '@/lib/api/client'

export interface MunicipioAtendido {
  id: string
  nome: string
  uf: string
  chave: string
  ativo: boolean
}

/** Item da lista pública: só o que o formulário de inscrição precisa para decidir o corte. */
export interface MunicipioPublico {
  nome: string
  uf: string
}

/** Procura registrada em município ainda não atendido — dado estatístico da demanda reprimida. */
export interface InteresseNaoAtendido {
  id: string
  cidade: string
  estado?: string | null
  nome_completo?: string | null
  telefone?: string | null
  created: string
}

export const getMunicipiosPublicos = () =>
  api.get<MunicipioPublico[]>('/api/municipios-atendidos/publicos')

export const getMunicipios = () => api.get<MunicipioAtendido[]>('/api/municipios-atendidos')

export const criarMunicipio = (data: { nome: string; uf: string; ativo?: boolean }) =>
  api.post<MunicipioAtendido>('/api/municipios-atendidos', data)

export const editarMunicipio = (
  id: string,
  data: { nome: string; uf: string; ativo?: boolean },
) => api.put<MunicipioAtendido>(`/api/municipios-atendidos/${id}`, data)

export const excluirMunicipio = (id: string) =>
  api.delete<void>(`/api/municipios-atendidos/${id}`)

export const getInteressesNaoAtendidos = () =>
  api.get<InteresseNaoAtendido[]>('/api/municipios-atendidos/interesses')

/**
 * Compara o município digitado com a lista atendida do mesmo jeito que o backend: sem acento, sem
 * diferença de maiúsculas e com a UF junto.
 */
export const municipioAtendido = (
  lista: MunicipioPublico[],
  cidade: string,
  uf: string,
): boolean => {
  if (!lista.length) return true
  const chave = chaveMunicipio(cidade, uf)
  return lista.some((m) => chaveMunicipio(m.nome, m.uf) === chave)
}

const chaveMunicipio = (cidade: string, uf: string) => `${normalizar(cidade)}|${normalizar(uf)}`

const normalizar = (valor: string) =>
  (valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
