import { useState } from 'react'
import { useApp } from '@/store/app-context'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  ListFilter,
  Users,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { StatusInscricao } from '@/lib/types'

const statusMap: Record<StatusInscricao, { label: string; color: string }> = {
  AGUARDANDO: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  APROVADA: { label: 'Aprovada', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  REPROVADA: { label: 'Reprovada', color: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
  EM_ANALISE: { label: 'Em Análise', color: 'bg-sky-100 text-sky-800 hover:bg-sky-100' },
}

const getStatusInfo = (status: string | undefined) =>
  statusMap[status as StatusInscricao] ?? {
    label: status ?? '—',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  }

const safeStr = (val: unknown): string => (typeof val === 'string' ? val : '')
const safeLower = (val: unknown): string => safeStr(val).toLowerCase()

export default function AdminDashboard() {
  const { inscricoes, updateInscricaoStatus } = useApp()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    type: 'APROVAR' | 'REPROVAR'
    id: string | null
  }>({ isOpen: false, type: 'APROVAR', id: null })

  const filteredInscricoes = inscricoes.filter((i: Record<string, unknown>) => {
    const nome = safeLower(i.nome_completo)
    const cpf = safeStr(i.cpf)
    const matchText = nome.includes(filter.toLowerCase()) || cpf.includes(filter)
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter
    return matchText && matchStatus
  })

  const handleAction = (id: string, action: 'APROVAR' | 'ANALISE' | 'REPROVAR') => {
    if (action === 'ANALISE') {
      updateInscricaoStatus(id, 'EM_ANALISE')
      toast({ title: 'Inscrição marcada como em análise' })
    } else {
      setActionDialog({ isOpen: true, type: action, id })
    }
  }

  const confirmAction = () => {
    if (actionDialog.id) {
      if (actionDialog.type === 'APROVAR') {
        updateInscricaoStatus(actionDialog.id, 'APROVADA')
        toast({ title: 'Inscrição Aprovada!', description: 'Aluna notificada.' })
      } else if (actionDialog.type === 'REPROVAR') {
        updateInscricaoStatus(actionDialog.id, 'REPROVADA')
        toast({ title: 'Inscrição Reprovada', variant: 'destructive' })
      }
    }
    setActionDialog({ isOpen: false, type: 'APROVAR', id: null })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Inscrições</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as alunas do Projeto Força Feminina IV.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total de Inscrições</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inscricoes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inscricoes.filter((i: Record<string, unknown>) => i.status === 'APROVADA').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inscricoes.filter((i: Record<string, unknown>) => i.status === 'AGUARDANDO').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <XCircle className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inscricoes.filter((i: Record<string, unknown>) => i.status === 'EM_ANALISE').length}
            </div>
          </CardContent>
        </Card>
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
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <ListFilter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                <SelectItem value="APROVADA">Aprovada</SelectItem>
                <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                <SelectItem value="REPROVADA">Reprovada</SelectItem>
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
                {filteredInscricoes.map((inscricao: Record<string, unknown>) => {
                  const statusInfo = getStatusInfo(inscricao.status as string | undefined)
                  const createdDate = inscricao.created
                  return (
                    <TableRow key={(inscricao.id as string) || Math.random()}>
                      <TableCell className="font-medium">
                        {safeStr(inscricao.nome_completo) || '—'}
                      </TableCell>
                      <TableCell>{safeStr(inscricao.cpf) || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {safeStr(inscricao.turma).replace(/_/g, ' ') || '—'}
                      </TableCell>
                      <TableCell>
                        {createdDate ? new Date(createdDate as string).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color} variant="secondary">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleAction(inscricao.id as string, 'APROVAR')}
                            >
                              Aprovar Vaga
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAction(inscricao.id as string, 'ANALISE')}
                            >
                              Marcar em Análise
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleAction(inscricao.id as string, 'REPROVAR')}
                            >
                              Reprovar Inscrição
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredInscricoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={actionDialog.isOpen}
        onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, isOpen: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'APROVAR' ? 'Aprovar Inscrição' : 'Reprovar Inscrição'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'APROVAR'
                ? 'Confirme a aprovação da inscrição. A aluna será notificada.'
                : 'Tem certeza que deseja reprovar esta inscrição?'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ ...actionDialog, isOpen: false })}
            >
              Voltar
            </Button>
            <Button
              variant={actionDialog.type === 'REPROVAR' ? 'destructive' : 'default'}
              onClick={confirmAction}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
