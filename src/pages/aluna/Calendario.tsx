import { useState, useEffect, useCallback } from 'react'
import { getCalendarioByTurma } from '@/services/calendario'
import { getDashboardForcaFeminina } from '@/services/dashboard'
import { CalendarioAula } from '@/lib/types'
import { turmaLabels } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar as CalendarIcon, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

interface DashboardInfo {
  turma: string
}

export default function Calendario() {
  const [aulas, setAulas] = useState<CalendarioAula[]>([])
  const [turma, setTurma] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const loadCalendario = useCallback(async () => {
    try {
      const dash = await getDashboardForcaFeminina()
      setTurma(dash.turma)
      if (dash.turma) {
        const data = await getCalendarioByTurma(dash.turma)
        setAulas(data as unknown as CalendarioAula[])
      }
    } catch (err) {
      console.error('Failed to load calendario:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCalendario()
  }, [loadCalendario])

  useRealtime('calendario_aula', () => {
    loadCalendario()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendário de Aulas</h1>
        <p className="text-muted-foreground mt-1">
          {turma ? `Turma: ${turmaLabels[turma] ?? turma}` : 'Nenhuma turma atribuída'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aulas Programadas</CardTitle>
          <CardDescription>{aulas.length} aula(s) agendada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {aulas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma aula programada.
            </p>
          ) : (
            <div className="space-y-3">
              {aulas.map((aula) => {
                const dataObj = aula.data_aula ? new Date(aula.data_aula) : null
                const isPast = dataObj ? dataObj < new Date() : false
                return (
                  <div
                    key={aula.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {dataObj
                          ? dataObj.toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : aula.data_aula}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {turmaLabels[aula.turma] ?? aula.turma}
                      </div>
                    </div>
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground opacity-40" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
