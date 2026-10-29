import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { getInscricoesPaginated, type PaginatedInscricoes } from '@/services/ficha-inscricao'
import { FichaInscricaoFF } from '@/lib/types'
import { getStatusInfo, turmaLabels, nucleosCadastrados, formatarNucleo } from '@/lib/constants'
import { CRITERIO_ZONA, PONTOS_ZONA, PONTUACAO_MAXIMA, TOTAL_CRITERIOS } from '@/lib/pontuacao'
import { InscricaoDetailDialog } from '@/components/admin/InscricaoDetailDialog'
import { ApprovalDialog, CancellationDialog } from '@/components/admin/ActionDialogs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight, Loader2, Check, Clock } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const PER_PAGE = 10

/** Status em que a candidata ainda pode ser aprovada ou enviada à fila de espera. */
const decisaoEmAberto = (status?: string) =>
  ['AGUARDANDO', 'EM_ANALISE', 'LISTA_ESPERA'].includes(status ?? '')

/**
 * Aba de triagem: concentra, independente do status, quem alcançou a pontuação da zona
 * prioritária e ainda espera decisão. A lista de espera fica de fora — ela já tem aba própria e é
 * revista quando abre vaga.
 */
const ABA_PRIORIDADE = 'PRIORIDADE_80'

/**
 * Abas por situação, no mesmo padrão da tela de Projetos. A primeira aba reúne quem ainda
 * aguarda decisão, que é onde a gestão atua; as demais separam o histórico já decidido.
 */
const abasStatus: { value: string; label: string }[] = [
  { value: ABA_PRIORIDADE, label: `★ Prioridade ${PONTOS_ZONA}+` },
  { value: 'AGUARDANDO', label: '● Aguardando' },
  { value: 'EM_ANALISE', label: '● Em análise' },
  { value: 'LISTA_ESPERA', label: '● Em espera' },
  { value: 'APROVADA', label: '● Aprovadas' },
  { value: 'CANCELADA', label: '● Canceladas' },
  { value: 'REPROVADA', label: '● Reprovadas' },
  { value: 'ALL', label: 'Todas' },
]

export default function AdminInscricoes() {
  const { updateInscricaoStatus, isAuthenticated, user } = useApp()
  // Administrativo e Gestão Geral analisam e decidem inscrições; os demais perfis apenas consultam.
  const podeAnalisarInscricao = user?.perfil === 'ADMINISTRATIVO' || user?.perfil === 'GESTAO_GERAL'
  const podeDecidirVagaCrianca = podeAnalisarInscricao
  const [data, setData] = useState<PaginatedInscricoes | null>(null)
  const [page, setPage] = useState(1)
  // Abre em "Aguardando": é a fila que a gestão precisa decidir.
  const [statusFilter, setStatusFilter] = useState('AGUARDANDO')
  const [turmaFilter, setTurmaFilter] = useState('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [detailInscricao, setDetailInscricao] = useState<FichaInscricaoFF | null>(null)
  const [approvalId, setApprovalId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [decidindo, setDecidindo] = useState(false)

  /**
   * `silencioso` é usado pela atualização automática: recarregar em segundo plano não pode
   * trocar a tabela por um spinner, senão a tela pisca a cada ciclo do polling.
   */
  const loadData = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const prioridade = statusFilter === ABA_PRIORIDADE
      const result = await getInscricoesPaginated({
        page,
        perPage: PER_PAGE,
        // A aba de prioridade corta por pontuação, não por um status específico.
        status: prioridade ? 'ALL' : statusFilter,
        pontuacaoMinima: prioridade ? PONTOS_ZONA : undefined,
        pendentesAnalise: prioridade ? true : undefined,
        turma: turmaFilter,
        search,
      })
      setData(result)
    } catch (err) {
      console.error('Failed to load inscricoes:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, turmaFilter, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime(
    'ficha_inscricao_ff',
    () => {
      loadData(true)
    },
    isAuthenticated,
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setSearch(searchInput)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const onStatusChange = (v: string) => {
    setPage(1)
    setStatusFilter(v)
  }
  const onTurmaChange = (v: string) => {
    setPage(1)
    setTurmaFilter(v)
  }

  const handleApprove = async (date: string) => {
    if (!approvalId) return
    // A data da 1ª aula é opcional na aprovação: o fluxo normal define depois do envio da ficha
    // de confirmação, e é lá que a aluna recebe o aviso.
    const { error } = await updateInscricaoStatus(
      approvalId,
      'APROVADA',
      date ? { data_primeira_aula: date } : undefined,
    )
    if (error) {
      toast({ title: 'Erro ao aprovar', variant: 'destructive' })
      return
    }
    setApprovalId(null)
    setDetailInscricao(null)
    toast({
      title: 'Inscrição Aprovada!',
      description: date
        ? 'Aluna notificada.'
        : 'A aluna já pode preencher a ficha de confirmação.',
    })
    loadData()
  }

  const handleWaitlist = async (id: string) => {
    setDecidindo(true)
    const { error } = await updateInscricaoStatus(id, 'LISTA_ESPERA')
    if (error) {
      toast({ title: 'Erro', variant: 'destructive' })
      setDecidindo(false)
      return
    }
    toast({ title: 'Inscrição movida para Lista de Espera' })
    setDetailInscricao(null)
    loadData()
    setDecidindo(false)
  }

  const handleAnalyze = async (id: string) => {
    setDecidindo(true)
    const { error } = await updateInscricaoStatus(id, 'EM_ANALISE')
    if (error) {
      toast({ title: 'Erro', variant: 'destructive' })
      setDecidindo(false)
      return
    }
    toast({ title: 'Inscrição marcada como em análise' })
    setDetailInscricao(null)
    loadData()
    setDecidindo(false)
  }

  const handleCancel = async (motivo: string) => {
    if (!cancelId) return
    const { error } = await updateInscricaoStatus(cancelId, 'CANCELADA', {
      motivo_cancelamento: motivo,
    })
    if (error) {
      toast({ title: 'Erro ao cancelar', variant: 'destructive' })
      return
    }
    setCancelId(null)
    toast({ title: 'Inscrição Cancelada', variant: 'destructive' })
    loadData()
  }

  const safeStr = (val: unknown): string => (typeof val === 'string' ? val : '')
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inscrições</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as inscrições do Projeto Força Feminina IV.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscrições Recebidas</CardTitle>
          <CardDescription>
            Ordenadas pela pontuação dos critérios de prioridade. Em caso de empate, leia o relato
            da candidata para concluir a análise. Morar na cidade e na zona prioritária do núcleo
            vale {PONTOS_ZONA} dos {PONTUACAO_MAXIMA} pontos; os outros nove critérios dividem os{' '}
            {PONTUACAO_MAXIMA - PONTOS_ZONA} restantes. A aba{' '}
            <strong>Prioridade {PONTOS_ZONA}+</strong> reúne quem mora na zona prioritária e ainda
            espera decisão (Aguardando e Em análise); a fila de espera continua na aba dela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={onStatusChange} className="mb-6">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              {abasStatus.map((aba) => (
                <TabsTrigger key={aba.value} value={aba.value}>
                  {aba.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                className="pl-9 bg-background"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={turmaFilter} onValueChange={onTurmaChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as turmas</SelectItem>
                {nucleosCadastrados.map(({ codigo, nome }) => (
                  <SelectItem key={codigo} value={codigo}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Aluna</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Relato para desempate</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((inscricao) => {
                    const status = getStatusInfo(inscricao.status)
                    const created = inscricao.created
                      ? new Date(inscricao.created).toLocaleDateString('pt-BR')
                      : '—'
                    return (
                      <TableRow
                        key={inscricao.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setDetailInscricao(inscricao)}
                      >
                        <TableCell className="font-medium">
                          {safeStr(inscricao.nome_completo) || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap font-semibold">
                            {inscricao.pontuacao_prioridade ?? 0} pontos
                          </Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {inscricao.criterios_prioridade?.includes(CRITERIO_ZONA)
                              ? 'Zona prioritária'
                              : 'Fora da zona prioritária'}{' '}
                            · {inscricao.criterios_prioridade?.length ?? 0}/{TOTAL_CRITERIOS}{' '}
                            critérios
                          </p>
                        </TableCell>
                        <TableCell>{safeStr(inscricao.cpf) || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatarNucleo(inscricao.turma)}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {inscricao.motivo_participar || 'Sem relato informado'}
                          </p>
                        </TableCell>
                        <TableCell>{created}</TableCell>
                        <TableCell>
                          <Badge className={status.color} variant="secondary">
                            {status.label}
                          </Badge>
                          {/*
                            Decisão direta na listagem: evita abrir o detalhe só para aprovar ou
                            enviar à fila. O clique não pode propagar, senão abriria o diálogo.
                          */}
                          {podeAnalisarInscricao && decisaoEmAberto(inscricao.status) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={decidindo}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setApprovalId(inscricao.id)
                                }}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Aprovar
                              </Button>
                              {inscricao.status !== 'LISTA_ESPERA' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={decidindo}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleWaitlist(inscricao.id)
                                  }}
                                >
                                  <Clock className="mr-1 h-3 w-3" />
                                  Fila de espera
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && data && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages} ({data.totalItems} registros)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InscricaoDetailDialog
        inscricao={detailInscricao}
        open={!!detailInscricao}
        onOpenChange={(open) => !open && setDetailInscricao(null)}
        podeDecidirVagaCrianca={podeDecidirVagaCrianca}
        podeDecidirInscricao={podeAnalisarInscricao}
        decidindo={decidindo}
        onAprovar={() => detailInscricao && setApprovalId(detailInscricao.id)}
        onListaEspera={() => detailInscricao && handleWaitlist(detailInscricao.id)}
        onMarcarAnalise={() => detailInscricao && handleAnalyze(detailInscricao.id)}
        onCancelar={() => detailInscricao && setCancelId(detailInscricao.id)}
      />
      <ApprovalDialog
        open={!!approvalId}
        onOpenChange={(open) => !open && setApprovalId(null)}
        onConfirm={handleApprove}
      />
      <CancellationDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
        onConfirm={handleCancel}
      />
    </div>
  )
}
