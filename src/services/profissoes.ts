import api from '@/lib/api/client'

export interface ProfissaoCbo {
  codigo: string
  titulo: string
}

export const buscarProfissoes = (busca: string) =>
  api.get<ProfissaoCbo[]>(`/api/profissoes?busca=${encodeURIComponent(busca)}&limite=20`)
