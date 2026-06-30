import pb from '@/lib/pocketbase/client'
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
}

export async function getResumoChamadas(): Promise<ResumoChamadas> {
  const registros = await pb.collection('presenca').getFullList<Presenca>({
    sort: '-data_aula',
  })

  if (registros.length === 0) {
    return { totalAulas: 0, totalPresencas: 0, totalFaltas: 0, percentualGeral: 0, porTurma: [], ultimasAulas: [] }
  }

  const totalPresencas = registros.filter((r) => r.presente).length
  const totalFaltas = registros.filter((r) => !r.presente).length
  const percentualGeral = registros.length > 0
    ? Math.round((totalPresencas / registros.length) * 100)
    : 0

  // Últimas 5 datas únicas de aula
  const datasUnicas = [...new Set(registros.map((r) => r.data_aula))].slice(0, 5)
  const ultimasAulas = datasUnicas.map((data) => {
    const aula = registros.filter((r) => r.data_aula === data)
    return {
      data,
      presentes: aula.filter((r) => r.presente).length,
      ausentes: aula.filter((r) => !r.presente).length,
    }
  })

  // Agrupamento por turma — presenca não tem campo turma direto,
  // usamos totalAulas = datas únicas de cada usuário
  const totalAulas = datasUnicas.length

  return {
    totalAulas,
    totalPresencas,
    totalFaltas,
    percentualGeral,
    porTurma: [],
    ultimasAulas,
  }
}
