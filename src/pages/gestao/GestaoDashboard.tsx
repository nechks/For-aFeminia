import { useState, useEffect, useCallback } from 'react'
import { getIndicadores, type IndicadoresData } from '@/services/indicadores'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Users, TrendingDown, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { turmaLabels, statusInfo } from '@/lib/constants'
import { toast } from '@/components/ui/use-toast'

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e']

export default function GestaoDashboard() {
  const [data, setData] = useState<IndicadoresData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const result = await getIndicadores()
      setData(result)
    } catch (err) {
      console.error('Failed to load indicadores:', err)
      toast({ title: 'Erro ao carregar indicadores', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('ficha_inscricao_ff', () => loadData())
  useRealtime('ficha_confirmacao_ff', () => loadData())
  useRealtime('presenca', () => loadData())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <AlertCircle className="w-5 h-5 mr-2" />
        Não foi possível carregar os indicadores.
      </div>
    )
  }

  const statusChartData = Object.entries(data.statusDistribution).map(([key, value]) => ({
    name: statusInfo[key as keyof typeof statusInfo]?.label ?? key,
    value,
  }))

  const turmaChartData = Object.entries(data.turmaDistribution).map(([key, value]) => ({
    name: turmaLabels[key] ?? key,
    value,
  }))

  const rendaChartData = Object.entries(data.socioeconomicDistribution.rendaFamiliar).map(
    ([name, value]) => ({ name, value }),
  )

  const moradiaChartData = Object.entries(data.socioeconomicDistribution.tipoMoradia).map(
    ([name, value]) => ({ name, value }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Gestão Geral</h1>
        <p className="text-muted-foreground mt-1">
          Indicadores estratégicos do Projeto Força Feminina IV.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total de Alunas',
            value: data.totalStudents,
            icon: Users,
            color: 'text-indigo-500',
          },
          {
            label: 'Total de Inscrições',
            value: data.totalInscricoes,
            icon: FileText,
            color: 'text-sky-500',
          },
          {
            label: 'Taxa de Evasão',
            value: `${data.dropoutRate}%`,
            icon: TrendingDown,
            color: 'text-rose-500',
          },
          {
            label: 'Cancelamentos',
            value: data.canceladas,
            icon: AlertCircle,
            color: 'text-amber-500',
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Status das inscrições no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Quantidade' } }}
              className="h-[300px] w-full"
            >
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Turma</CardTitle>
            <CardDescription>Alunas aprovadas por turma</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Alunas' } }} className="h-[300px] w-full">
              <BarChart data={turmaChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={140}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil Socioeconômico — Renda</CardTitle>
            <CardDescription>Distribuição de renda familiar per capita</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Alunas' } }} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={rendaChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {rendaChartData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil Socioeconômico — Moradia</CardTitle>
            <CardDescription>Tipo de moradia das alunas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Alunas' } }} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={moradiaChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {moradiaChartData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
