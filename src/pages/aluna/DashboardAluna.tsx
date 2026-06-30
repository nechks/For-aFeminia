import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { getDashboardForcaFeminina } from '@/services/dashboard'
import { DashboardData } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Calendar as CalendarIcon,
  MapPin,
  Bell,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { turmaLabels } from '@/lib/constants'

export default function DashboardAluna() {
  const { user, minhaConfirmacao, isAuthenticated } = useApp()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardForcaFeminina()
      setDashboard(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useRealtime(
    'presenca',
    () => {
      loadDashboard()
    },
    isAuthenticated,
  )

  useRealtime(
    'mural',
    () => {
      loadDashboard()
    },
    isAuthenticated,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const precisaPreencherFicha = !minhaConfirmacao

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {dashboard?.nome?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Aluna'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vinda ao seu painel do Projeto Força Feminina.
        </p>
      </div>

      {precisaPreencherFicha && (
        <Card className="bg-secondary/10 border-secondary/20 shadow-sm animate-slide-up">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-secondary/20 p-3 rounded-full mt-1">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ação Necessária: Ficha de Confirmação</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você foi aprovada! Para garantir sua vaga, preencha o questionário completo.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 bg-secondary hover:bg-secondary/90">
              <Link to="/aluna/ficha">
                Preencher Agora <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seu Progresso</CardTitle>
              <CardDescription>Acompanhe sua frequência nas aulas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-muted">
                  <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                    <circle
                      className="text-secondary stroke-current"
                      strokeWidth="8"
                      strokeDasharray="352"
                      strokeDashoffset={352 - (352 * (dashboard?.percentualFrequencia ?? 0)) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-primary">
                      {(dashboard?.percentualFrequencia ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Aulas Assistidas: <strong>{dashboard?.aulasAssistidas ?? 0}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Total: <strong>{dashboard?.totalAulas ?? 0}</strong>
                    </span>
                  </div>
                  <Progress
                    value={dashboard?.percentualFrequencia ?? 0}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-secondary"
                  />
                  <p className="text-sm text-muted-foreground">
                    Continue assim! A presença regular é essencial para o certificado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mural de Avisos</CardTitle>
                <CardDescription>Comunicações da coordenação</CardDescription>
              </div>
              <Bell className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {(dashboard?.avisos ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum aviso no momento.
                </p>
              ) : (
                (dashboard?.avisos ?? []).map((aviso) => (
                  <div
                    key={aviso.id}
                    className="p-4 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {aviso.turma ? (
                        <span className="text-xs font-medium text-primary px-2 py-1 bg-primary/10 rounded-full">
                          {turmaLabels[aviso.turma] ?? aviso.turma}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-secondary px-2 py-1 bg-secondary/10 rounded-full">
                          Geral
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {aviso.data_publicacao
                          ? new Date(aviso.data_publicacao).toLocaleDateString('pt-BR')
                          : ''}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm">{aviso.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{aviso.conteudo}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Próxima Aula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-card rounded-lg border p-4 text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-semibold text-lg text-primary">Sábado, 20/06</div>
                <div className="text-sm font-medium">14:00 - 16:30</div>
                <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                  <MapPin className="w-3 h-3 mr-1" /> Centro, Vitória
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sua Turma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <CheckCircle2 className="w-4 h-4 text-secondary mr-2" />
                  <span className="font-medium">
                    {turmaLabels[dashboard?.turma ?? ''] ??
                      ((dashboard?.turma ?? '').replace(/_/g, ' ') || '—')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Frequência:{' '}
                  <strong className="text-emerald-600">
                    {(dashboard?.percentualFrequencia ?? 0).toFixed(1)}%
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
