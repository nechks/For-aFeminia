import api from '@/lib/api/client'
import { Presenca } from '@/lib/types'

export interface ResumoChamadas {
  totalAulas: number
  totalPresencas: number
  totalFaltas: number
  percentualGeral: number
  porTurma: {
    turma: string
    totalAulas: number
    totalPresencas: number
    percentual: number
  }[]
  ultimasAulas: {
    data: string
    presentes: number
    ausentes: number
  }[]
  /** Todas as datas de aula, da mais recente para a mais antiga. */
  todasAulas: {
    data: string
    presentes: number
    ausentes: number
  }[]
}

export async function getResumoChamadas(): Promise<ResumoChamadas> {
  const registros = await api.get<Presenca[]>('/api/presencas')

  if (registros.length === 0) {
    return {
      totalAulas: 0,
      totalPresencas: 0,
      totalFaltas: 0,
      percentualGeral: 0,
      porTurma: [],
      ultimasAulas: [],
      todasAulas: [],
    }
  }

  // Cada chamada vale meia aula: Defesa Pessoal e Roda de Conversa do mesmo dia somam uma aula.
  const totalPresencas = registros.filter((r) => r.presente).length * 0.5
  const totalFaltas = registros.filter((r) => !r.presente).length * 0.5
  const percentualGeral =
    registros.length > 0 ? Math.round((totalPresencas / (totalPresencas + totalFaltas)) * 100) : 0

  const datasUnicas = [...new Set(registros.map((r) => r.data_aula))]
  const todasAulas = datasUnicas.map((data) => {
    const aula = registros.filter((r) => r.data_aula === data)
    return {
      data,
      presentes: aula.filter((r) => r.presente).length * 0.5,
      ausentes: aula.filter((r) => !r.presente).length * 0.5,
    }
  })
  const ultimasAulas = todasAulas.slice(0, 5)

  const totalAulas = datasUnicas.length

  return {
    totalAulas,
    totalPresencas,
    totalFaltas,
    percentualGeral,
    porTurma: [],
    ultimasAulas,
    todasAulas,
  }
}
