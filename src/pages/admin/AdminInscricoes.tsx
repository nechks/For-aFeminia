import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { getInscricoesPaginated, type PaginatedInscricoes } from '@/services/ficha-inscricao'
import { FichaInscricaoFF } from '@/lib/types'
import { getStatusInfo, turmaLabels, statusInfo } from '@/lib/constants'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const PER_PAGE = 10

export default function AdminInscricoes() {
  const { updateInscricaoStatus, isAuthenticated } = useApp()
  const [data, setData] = useState<PaginatedInscricoes | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [turmaFilter, setTurmaFilter] = useState('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [detailInscricao, setDetailInscricao] = useState<FichaInscricaoFF | null>(null)
  const [approvalId, setApprovalId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getInscricoesPaginated({
        page,
        perPage: PER_PAGE,
        status: statusFilter,
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
      loadData()
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
    const { error } = await updateInscricaoStatus(approvalId, 'APROVADA', {
      data_primeira_aula: date,
    })
    if (error) {
      toast({ title: 'Erro ao aprovar', variant: 'destructive' })
      return
    }
    setApprovalId(null)
    toast({ title: 'Inscrição Aprovada!', description: 'Aluna notificada.' })
    loadData()
  }

  const handleWaitlist = async (id: string) => {
    const { error } = await updateInscricaoStatus(id, 'LISTA_ESPERA')
    if (error) {
      toast({ title: 'Erro', variant: 'destructive' })
      return
    }
    toast({ title: 'Inscrição movida para Lista de Espera' })
    loadData()
  }

  const handleAnalyze = async (id: string) => {
    const { error } = await updateInscricaoStatus(id, 'EM_ANALISE')
    if (error) {
      toast({ title: 'Erro', variant: 'destructive' })
      return
    }
    toast({ title: 'Inscrição marcada como em análise' })
    loadData()
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
          <CardDescription>Lista completa de cadastros realizados pelo portal.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {Object.entries(statusInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={turmaFilter} onValueChange={onTurmaChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as turmas</SelectItem>
                {Object.entries(turmaLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
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
                  <TableHead>CPF</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
                        <TableCell>{safeStr(inscricao.cpf) || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {turmaLabels[inscricao.turma ?? ''] ?? (safeStr(inscricao.turma) || '—')}
                        </TableCell>
                        <TableCell>{created}</TableCell>
                        <TableCell>
                          <Badge className={status.color} variant="secondary">
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setDetailInscricao(inscricao)}>
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setApprovalId(inscricao.id)}>
                                Aprovar Vaga
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAnalyze(inscricao.id)}>
                                Marcar em Análise
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleWaitlist(inscricao.id)}>
                                Lista de Espera
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setCancelId(inscricao.id)}
                              >
                                Cancelar Inscrição
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
