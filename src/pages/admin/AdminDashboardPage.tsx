import { useMemo, useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import {
  CheckCircle,
  Clock,
  ListChecks,
  Users,
  XCircle,
  Search,
  UserCheck,
  UserX,
  CalendarDays,
} from 'lucide-react'
import { turmaLabels } from '@/lib/constants'
import { getResumoChamadas, type ResumoChamadas } from '@/services/chamadas-resumo'

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO: '#f59e0b',
  APROVADA: '#10b981',
  REPROVADA: '#f43f5e',
  EM_ANALISE: '#0ea5e9',
  LISTA_ESPERA: '#8b5cf6',
  CANCELADA: '#9ca3af',
}

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO: 'Aguardando',
  APROVADA: 'Aprovadas',
  REPROVADA: 'Reprovadas',
  EM_ANALISE: 'Em Análise',
  LISTA_ESPERA: 'Lista Espera',
  CANCELADA: 'Canceladas',
}

export default function AdminDashboardPage() {
  const { inscricoes } = useApp()
  const [chamadas, setChamadas] = useState<ResumoChamadas | null>(null)

  const loadChamadas = useCallback(async () => {
    try {
      setChamadas(await getResumoChamadas())
    } catch {
      // silencia erro se a coleção estiver vazia
    }
  }, [])

  useEffect(() => {
    loadChamadas()
  }, [loadChamadas])

  const stats = useMemo(
    () => ({
      total: inscricoes.length,
      aprovadas: inscricoes.filter((i) => i.status === 'APROVADA').length,
      aguardando: inscricoes.filter((i) => i.status === 'AGUARDANDO').length,
      emAnalise: inscricoes.filter((i) => i.status === 'EM_ANALISE').length,
      listaEspera: inscricoes.filter((i) => i.status === 'LISTA_ESPERA').length,
      canceladas: inscricoes.filter((i) => i.status === 'CANCELADA').length,
    }),
    [inscricoes],
  )

  const statusChartData = useMemo(
    () =>
      Object.entries(STATUS_LABELS)
        .map(([key, label]) => ({
          name: label,
          value: inscricoes.filter((i) => i.status === key).length,
          color: STATUS_COLORS[key],
        }))
        .filter((d) => d.value > 0),
    [inscricoes],
  )

  const turmaChartData = useMemo(
    () =>
      Object.entries(turmaLabels).map(([key, label]) => ({
        name: label.split(' - ')[0],
        total: inscricoes.filter((i) => i.turma === key).length,
      })),
    [inscricoes],
  )

  const summaryCards = [
    {
      label: 'Total de Inscrições',
      value: stats.total,
      icon: Users,
      color: 'text-muted-foreground',
    },
    { label: 'Aprovadas', value: stats.aprovadas, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Aguardando', value: stats.aguardando, icon: Clock, color: 'text-amber-500' },
    { label: 'Em Análise', value: stats.emAnalise, icon: Search, color: 'text-sky-500' },
    {
      label: 'Lista de Espera',
      value: stats.listaEspera,
      icon: ListChecks,
      color: 'text-violet-500',
    },
    { label: 'Canceladas', value: stats.canceladas, icon: XCircle, color: 'text-rose-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do Projeto Força Feminina IV.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium leading-tight">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo de Chamadas */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Chamadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium">Total de Aulas</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chamadas?.totalAulas ?? '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium">Presenças Registradas</CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {chamadas?.totalPresencas ?? '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium">Faltas Registradas</CardTitle>
              <UserX className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{chamadas?.totalFaltas ?? '—'}</div>
            </CardContent>
          </Card>
        </div>

        {chamadas && chamadas.ultimasAulas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Últimas Aulas — Presenças vs Faltas</CardTitle>
              <CardDescription>Resultado das chamadas mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chamadas.ultimasAulas.map((a) => ({
                    data: new Date(a.data).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    }),
                    Presentes: a.presentes,
                    Faltas: a.ausentes,
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Presentes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Faltas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Proporção de inscrições em cada status.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Inscrições']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inscrições por Turma</CardTitle>
            <CardDescription>Total de inscrições em cada unidade.</CardDescription>
          </CardHeader>
          <CardContent>
            {turmaChartData.every((d) => d.total === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={turmaChartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 40 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    name="Inscrições"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
