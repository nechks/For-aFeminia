import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getIndicadores, type IndicadoresData } from '@/services/indicadores'
import { getResumoChamadas, type ResumoChamadas } from '@/services/chamadas-resumo'
import { getInscricoesPaginated } from '@/services/ficha-inscricao'
import { getPresencasDetalhes, type PresencaDetalhe } from '@/services/presenca'
import { FichaInscricaoFF } from '@/lib/types'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, TrendingDown, FileText, AlertCircle, Loader2, CalendarDays, UserCheck, UserX, ArrowRight } from 'lucide-react'
import { turmaLabels, statusInfo, getStatusInfo } from '@/lib/constants'
import { toast } from '@/components/ui/use-toast'

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e']

type DialogAberto = 'inscricoes' | 'presencas' | 'faltas' | null

export default function GestaoDashboard() {
  const [data, setData] = useState<IndicadoresData | null>(null)
  const [chamadas, setChamadas] = useState<ResumoChamadas | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState<DialogAberto>(null)
  const [aguardando, setAguardando] = useState<FichaInscricaoFF[]>([])
  const [detalhes, setDetalhes] = useState<PresencaDetalhe[]>([])
  const [loadingDialog, setLoadingDialog] = useState(false)

  const abrirInscricoes = async () => {
    setDialogAberto('inscricoes')
    setLoadingDialog(true)
    try {
      const result = await getInscricoesPaginated({ status: 'AGUARDANDO', perPage: 100 })
      setAguardando(result.items)
    } catch {
      toast({ title: 'Erro ao carregar inscrições', variant: 'destructive' })
    } finally {
      setLoadingDialog(false)
    }
  }

  const abrirPresencas = async (presente: boolean) => {
    setDialogAberto(presente ? 'presencas' : 'faltas')
    setLoadingDialog(true)
    try {
      setDetalhes(await getPresencasDetalhes(presente))
    } catch {
      toast({ title: 'Erro ao carregar registros', variant: 'destructive' })
    } finally {
      setLoadingDialog(false)
    }
  }

  const loadData = useCallback(async () => {
    try {
      const [indicadores, resumo] = await Promise.all([getIndicadores(), getResumoChamadas()])
      setData(indicadores)
      setChamadas(resumo)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Gestão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Indicadores estratégicos do Projeto Força Feminina IV.
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link to="/admin/inscricoes">
            Aprovar Alunas <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total de Alunas</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">aprovadas e ativas</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          role="button"
          onClick={abrirInscricoes}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total de Inscrições</CardTitle>
            <FileText className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalInscricoes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.aguardandoAprovacao} aguardando aprovação · clique para ver
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Taxa de Evasão</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.dropoutRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.canceladas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Chamadas */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Chamadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total de Aulas</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chamadas?.totalAulas ?? '—'}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            role="button"
            onClick={() => abrirPresencas(true)}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Presenças Registradas</CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{chamadas?.totalPresencas ?? '—'}</div>
              <p className="text-xs text-muted-foreground mt-1">clique para ver a lista</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            role="button"
            onClick={() => abrirPresencas(false)}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Faltas Registradas</CardTitle>
              <UserX className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{chamadas?.totalFaltas ?? '—'}</div>
              <p className="text-xs text-muted-foreground mt-1">clique para ver a lista</p>
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
              <ChartContainer
                config={{ Presentes: { label: 'Presentes', color: '#10b981' }, Faltas: { label: 'Faltas', color: '#f43f5e' } }}
                className="h-[220px] w-full"
              >
                <BarChart
                  data={chamadas.ultimasAulas.map((a) => ({
                    data: new Date(a.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    Presentes: a.presentes,
                    Faltas: a.ausentes,
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="Presentes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Faltas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
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

      {/* Dialog: inscrições aguardando aprovação */}
      <Dialog open={dialogAberto === 'inscricoes'} onOpenChange={(o) => !o && setDialogAberto(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inscrições Aguardando Aprovação</DialogTitle>
            <DialogDescription>
              Alunas que se inscreveram e ainda não foram analisadas.
            </DialogDescription>
          </DialogHeader>
          {loadingDialog ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto my-8 text-muted-foreground" />
          ) : aguardando.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma inscrição aguardando aprovação.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aguardando.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nome_completo}</TableCell>
                    <TableCell>{turmaLabels[i.turma ?? ''] ?? i.turma ?? '—'}</TableCell>
                    <TableCell>
                      {i.created ? new Date(i.created).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusInfo(i.status).color} variant="secondary">
                        {getStatusInfo(i.status).label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end">
            <Button asChild className="gap-2">
              <Link to="/admin/inscricoes">
                Ir para Aprovação <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: presenças/faltas detalhadas */}
      <Dialog
        open={dialogAberto === 'presencas' || dialogAberto === 'faltas'}
        onOpenChange={(o) => !o && setDialogAberto(null)}
      >
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogAberto === 'presencas' ? 'Presenças Registradas' : 'Faltas Registradas'}
            </DialogTitle>
            <DialogDescription>
              {dialogAberto === 'presencas'
                ? 'Alunas com presença registrada nas chamadas.'
                : 'Alunas com falta registrada, incluindo justificativas.'}
            </DialogDescription>
          </DialogHeader>
          {loadingDialog ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto my-8 text-muted-foreground" />
          ) : detalhes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum registro encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluna</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Professor(a)</TableHead>
                  {dialogAberto === 'faltas' && <TableHead>Justificativa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.aluna_nome}</TableCell>
                    <TableCell>{turmaLabels[d.turma] ?? d.turma ?? '—'}</TableCell>
                    <TableCell>
                      {new Date(d.data_aula + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{d.professor_nome || '—'}</TableCell>
                    {dialogAberto === 'faltas' && (
                      <TableCell>
                        {d.justificativa ? (
                          <span className="text-sm">{d.justificativa}</span>
                        ) : (
                          <Badge variant="secondary" className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                            Sem justificativa
                          </Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
