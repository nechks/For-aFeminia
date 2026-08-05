import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  getIndicadores,
  getIndicadoresPorTurma,
  type IndicadoresData,
  type IndicadorTurma,
} from '@/services/indicadores'
import { getResumoChamadas, type ResumoChamadas } from '@/services/chamadas-resumo'
import { getInscricoesPaginated } from '@/services/ficha-inscricao'
import { getPresencasDetalhes, type PresencaDetalhe } from '@/services/presenca'
import { getAlunasTurma, type AlunaTurma } from '@/services/turmas'
import { FichaInscricaoFF } from '@/lib/types'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CardIndicador from '@/components/dashboard/CardIndicador'
import FaltasPorTurma from '@/components/dashboard/FaltasPorTurma'
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
import {
  Users,
  TrendingDown,
  FileText,
  AlertCircle,
  Loader2,
  CalendarDays,
  UserCheck,
  UserX,
  ArrowRight,
  Hourglass,
} from 'lucide-react'
import { turmaLabels, statusInfo, getStatusInfo } from '@/lib/constants'
import { formatarAulas, formatarDias, turnoLabel } from '@/lib/turmas'
import { getErrorMessage } from '@/lib/api/errors'
import { toast } from '@/components/ui/use-toast'

const PIE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7']

type DialogAberto =
  | 'alunas'
  | 'inscricoes'
  | 'listaEspera'
  | 'canceladas'
  | 'aulas'
  | 'presencas'
  | 'faltas'
  | 'turma'
  | null

const TITULOS: Record<string, { titulo: string; descricao: string }> = {
  alunas: { titulo: 'Alunas Aprovadas', descricao: 'Alunas com inscrição aprovada e ativa.' },
  inscricoes: {
    titulo: 'Inscrições',
    descricao: 'Todas as inscrições do sistema, exceto a lista de espera.',
  },
  listaEspera: {
    titulo: 'Lista de Espera',
    descricao: 'Alunas aguardando vaga. Não entram no total de inscrições.',
  },
  canceladas: {
    titulo: 'Cancelamentos',
    descricao: 'Inscrições canceladas — são elas que formam a taxa de evasão.',
  },
}

export default function GestaoDashboard() {
  const { user } = useApp()
  const [data, setData] = useState<IndicadoresData | null>(null)
  const [chamadas, setChamadas] = useState<ResumoChamadas | null>(null)
  const [porTurma, setPorTurma] = useState<IndicadorTurma[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState<DialogAberto>(null)
  const [inscricoes, setInscricoes] = useState<FichaInscricaoFF[]>([])
  const [detalhes, setDetalhes] = useState<PresencaDetalhe[]>([])
  const [alunasTurma, setAlunasTurma] = useState<AlunaTurma[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState<IndicadorTurma | null>(null)
  const [loadingDialog, setLoadingDialog] = useState(false)

  const erroDialog = (e: unknown) =>
    toast({ title: 'Erro ao carregar a lista', description: getErrorMessage(e), variant: 'destructive' })

  /** Abre a lista de nomes por trás do número do card. */
  const abrirInscricoes = async (tipo: 'alunas' | 'inscricoes' | 'listaEspera' | 'canceladas') => {
    setDialogAberto(tipo)
    setLoadingDialog(true)
    try {
      const status =
        tipo === 'alunas'
          ? 'APROVADA'
          : tipo === 'listaEspera'
            ? 'LISTA_ESPERA'
            : tipo === 'canceladas'
              ? 'CANCELADA'
              : 'ALL'
      const result = await getInscricoesPaginated({ status, perPage: 200 })
      // O total de inscrições exclui a lista de espera (regra 4.2), então a lista segue a mesma regra.
      setInscricoes(
        tipo === 'inscricoes'
          ? result.items.filter((i) => i.status !== 'LISTA_ESPERA')
          : result.items,
      )
    } catch (e) {
      erroDialog(e)
    } finally {
      setLoadingDialog(false)
    }
  }

  const abrirPresencas = async (presente: boolean) => {
    setDialogAberto(presente ? 'presencas' : 'faltas')
    setLoadingDialog(true)
    try {
      setDetalhes(await getPresencasDetalhes(presente))
    } catch (e) {
      erroDialog(e)
    } finally {
      setLoadingDialog(false)
    }
  }

  const abrirTurma = async (turma: IndicadorTurma) => {
    setTurmaSelecionada(turma)
    setDialogAberto('turma')
    setLoadingDialog(true)
    try {
      setAlunasTurma(await getAlunasTurma(turma.turma_id))
    } catch (e) {
      erroDialog(e)
    } finally {
      setLoadingDialog(false)
    }
  }

  const loadData = useCallback(async () => {
    try {
      const [indicadores, resumo, turmas] = await Promise.all([
        getIndicadores(),
        getResumoChamadas(),
        getIndicadoresPorTurma(),
      ])
      setData(indicadores)
      setChamadas(resumo)
      setPorTurma(turmas)
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
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        <AlertCircle className="mr-2 h-5 w-5" />
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

  const ehGestao = user?.perfil === 'GESTAO_GERAL'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {ehGestao ? 'Painel de Gestão Geral' : 'Painel Administrativo'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Indicadores estratégicos do Projeto Força Feminina IV. Todo card abre a lista de nomes.
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <Link to="/admin/inscricoes">
            Aprovar Alunas <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <CardIndicador
          titulo="Total de Alunas"
          valor={data.totalStudents}
          detalhe="aprovadas e ativas"
          icone={Users}
          corIcone="text-indigo-500"
          onClick={() => abrirInscricoes('alunas')}
        />
        <CardIndicador
          titulo="Total de Inscrições"
          valor={data.totalInscricoes}
          detalhe={`${data.aguardandoAprovacao} aguardando`}
          icone={FileText}
          corIcone="text-sky-500"
          onClick={() => abrirInscricoes('inscricoes')}
        />
        <CardIndicador
          titulo="Lista de Espera"
          valor={data.listaEspera}
          detalhe="aguardando vaga"
          icone={Hourglass}
          corIcone="text-violet-500"
          corValor="text-violet-600"
          onClick={() => abrirInscricoes('listaEspera')}
        />
        <CardIndicador
          titulo="Taxa de Evasão"
          valor={`${data.dropoutRate}%`}
          detalhe="sobre as inscrições"
          icone={TrendingDown}
          corIcone="text-rose-500"
          onClick={() => abrirInscricoes('canceladas')}
        />
        <CardIndicador
          titulo="Cancelamentos"
          valor={data.canceladas}
          icone={AlertCircle}
          corIcone="text-amber-500"
          onClick={() => abrirInscricoes('canceladas')}
        />
      </div>

      {/* Resumo de Chamadas */}
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" /> Chamadas
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Cada chamada vale meia aula: Defesa Pessoal e Roda de Conversa do mesmo dia somam 1.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <CardIndicador
            titulo="Total de Aulas"
            valor={chamadas?.totalAulas ?? '—'}
            detalhe="dias com chamada"
            icone={CalendarDays}
            corIcone="text-muted-foreground"
            onClick={() => setDialogAberto('aulas')}
          />
          <CardIndicador
            titulo="Presenças Registradas"
            valor={formatarAulas(chamadas?.totalPresencas)}
            icone={UserCheck}
            corIcone="text-emerald-500"
            corValor="text-emerald-600"
            onClick={() => abrirPresencas(true)}
          />
          <CardIndicador
            titulo="Faltas Registradas"
            valor={formatarAulas(chamadas?.totalFaltas)}
            icone={UserX}
            corIcone="text-rose-500"
            corValor="text-rose-600"
            onClick={() => abrirPresencas(false)}
          />
        </div>

        {chamadas && chamadas.ultimasAulas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Últimas Aulas — Presenças vs Faltas</CardTitle>
              <CardDescription>Resultado das chamadas mais recentes, em aulas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  Presentes: { label: 'Presentes', color: '#0ca30c' },
                  Faltas: { label: 'Faltas', color: '#d03b3b' },
                }}
                className="h-[220px] w-full"
              >
                <BarChart
                  data={chamadas.ultimasAulas.map((a) => ({
                    data: new Date(`${a.data}T00:00:00`).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    }),
                    Presentes: a.presentes,
                    Faltas: a.ausentes,
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="Presentes" fill="#0ca30c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Faltas" fill="#d03b3b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <FaltasPorTurma turmas={porTurma} onSelecionar={abrirTurma} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Status das inscrições no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Quantidade' } }} className="h-[300px] w-full">
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
            <CardTitle>Distribuição por Núcleo</CardTitle>
            <CardDescription>Alunas aprovadas por núcleo</CardDescription>
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
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
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
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
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

      {/* Dialog: listas de inscrições (alunas, inscrições, lista de espera, cancelamentos) */}
      <Dialog
        open={!!dialogAberto && !!TITULOS[dialogAberto]}
        onOpenChange={(o) => !o && setDialogAberto(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{TITULOS[dialogAberto ?? '']?.titulo}</DialogTitle>
            <DialogDescription>{TITULOS[dialogAberto ?? '']?.descricao}</DialogDescription>
          </DialogHeader>
          {loadingDialog ? (
            <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />
          ) : inscricoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscricoes.map((i) => (
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
                Ir para Inscrições <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: dias de aula */}
      <Dialog open={dialogAberto === 'aulas'} onOpenChange={(o) => !o && setDialogAberto(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dias de Aula</DialogTitle>
            <DialogDescription>
              Dias com chamada registrada, do mais recente para o mais antigo.
            </DialogDescription>
          </DialogHeader>
          {!chamadas || chamadas.todasAulas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma chamada registrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Presenças</TableHead>
                  <TableHead className="text-right">Faltas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chamadas.todasAulas.map((a) => (
                  <TableRow key={a.data}>
                    <TableCell className="font-medium">
                      {new Date(`${a.data}T00:00:00`).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {formatarAulas(a.presentes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600">
                      {formatarAulas(a.ausentes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: alunas da turma escolhida no gráfico */}
      <Dialog open={dialogAberto === 'turma'} onOpenChange={(o) => !o && setDialogAberto(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{turmaSelecionada?.turma_nome}</DialogTitle>
            <DialogDescription>
              🏠 {turmaSelecionada?.nucleo_nome} · {turnoLabel(turmaSelecionada?.turno)} ·{' '}
              {formatarDias(turmaSelecionada?.dias_semana)} —{' '}
              {formatarAulas(turmaSelecionada?.faltas_justificadas)} falta(s) justificada(s) e{' '}
              {formatarAulas(turmaSelecionada?.faltas_sem_justificativa)} sem justificativa.
            </DialogDescription>
          </DialogHeader>
          {loadingDialog ? (
            <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />
          ) : alunasTurma.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma aluna alocada nesta turma.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {alunasTurma.map((a) => (
                <li key={a.user_id} className="rounded-md border bg-background px-3 py-2">
                  {a.nome_completo}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: presenças/faltas detalhadas */}
      <Dialog
        open={dialogAberto === 'presencas' || dialogAberto === 'faltas'}
        onOpenChange={(o) => !o && setDialogAberto(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
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
            <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />
          ) : detalhes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
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
                      {new Date(`${d.data_aula}T00:00:00`).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{d.professor_nome || '—'}</TableCell>
                    {dialogAberto === 'faltas' && (
                      <TableCell>
                        {d.justificativa ? (
                          <span className="text-sm">{d.justificativa}</span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-rose-100 text-rose-800 hover:bg-rose-100"
                          >
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
