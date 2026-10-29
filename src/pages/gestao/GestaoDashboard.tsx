import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getIndicadores, type IndicadoresData } from '@/services/indicadores'
import { getInscricoesPaginated } from '@/services/ficha-inscricao'
import { FichaInscricaoFF } from '@/lib/types'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CardIndicador from '@/components/dashboard/CardIndicador'
import GraficosSocioeconomicos from '@/components/dashboard/GraficosSocioeconomicos'
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
  ArrowRight,
  Hourglass,
} from 'lucide-react'
import { turmaLabels, statusInfo, getStatusInfo } from '@/lib/constants'
import { getErrorMessage } from '@/lib/api/errors'
import { toast } from '@/components/ui/use-toast'


type DialogAberto =
  | 'alunas'
  | 'inscricoes'
  | 'listaEspera'
  | 'canceladas'
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
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState<DialogAberto>(null)
  const [inscricoes, setInscricoes] = useState<FichaInscricaoFF[]>([])
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

  const loadData = useCallback(async () => {
    try {
      setData(await getIndicadores())
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

  // Um único ciclo: os três hooks anteriores chamavam o mesmo `loadData`, triplicando as
  // requisições a /api/indicadores/dashboard a cada 10s e re-renderizando o painel sem necessidade.
  useRealtime('indicadores_dashboard', () => loadData())

  // Dados dos gráficos montados uma vez por resposta. Recriá-los a cada render (ao abrir um card,
  // por exemplo) fazia o Recharts apagar e redesenhar barras e fatias com animação.
  const graficos = useMemo(() => {
    if (!data) return null
    return {
      status: Object.entries(data.statusDistribution).map(([key, value]) => ({
        name: statusInfo[key as keyof typeof statusInfo]?.label ?? key,
        value,
      })),
      turma: Object.entries(data.turmaDistribution).map(([key, value]) => ({
        name: turmaLabels[key] ?? key,
        value,
      })),
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || !graficos) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        <AlertCircle className="mr-2 h-5 w-5" />
        Não foi possível carregar os indicadores.
      </div>
    )
  }

  const {
    status: statusChartData,
    turma: turmaChartData,
  } = graficos

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

        <GraficosSocioeconomicos dados={data.socioeconomicDistribution} />
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

    </div>
  )
}
