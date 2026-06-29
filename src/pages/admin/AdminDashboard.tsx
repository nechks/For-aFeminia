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
import { MoreHorizontal, Search, CheckCircle, Clock, XCircle, ListFilter } from 'lucide-react'
import { StatusInscricao } from '@/lib/types'
import { toast } from '@/components/ui/use-toast'

const statusMap = {
  AGUARDANDO: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  APROVADA: { label: 'Aprovada', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  LISTA_ESPERA: { label: 'Lista de Espera', color: 'bg-sky-100 text-sky-800 hover:bg-sky-100' },
  CANCELADA: { label: 'Cancelada', color: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
}

export default function AdminDashboard() {
  const { inscricoes, updateInscricaoStatus } = useApp()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Dialog state
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    type: 'APROVAR' | 'CANCELAR'
    id: string | null
  }>({ isOpen: false, type: 'APROVAR', id: null })
  const [dataAula, setDataAula] = useState('')

  const filteredInscricoes = inscricoes.filter((i) => {
    const matchText =
      i.nomeCompleto.toLowerCase().includes(filter.toLowerCase()) || i.cpf.includes(filter)
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter
    return matchText && matchStatus
  })

  const handleAction = (id: string, action: 'APROVAR' | 'ESPERA' | 'CANCELAR') => {
    if (action === 'ESPERA') {
      updateInscricaoStatus(id, 'LISTA_ESPERA')
      toast({ title: 'Movida para lista de espera' })
    } else {
      setActionDialog({ isOpen: true, type: action, id })
    }
  }

  const confirmAction = () => {
    if (actionDialog.id) {
      if (actionDialog.type === 'APROVAR') {
        updateInscricaoStatus(actionDialog.id, 'APROVADA', dataAula)
        toast({ title: 'Inscrição Aprovada!', description: 'Aluna notificada.' })
      } else if (actionDialog.type === 'CANCELAR') {
        updateInscricaoStatus(actionDialog.id, 'CANCELADA')
        toast({ title: 'Inscrição Cancelada', variant: 'destructive' })
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
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
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
              {inscricoes.filter((i) => i.status === 'APROVADA').length}
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
              {inscricoes.filter((i) => i.status === 'AGUARDANDO').length}
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
                <SelectItem value="LISTA_ESPERA">Lista de Espera</SelectItem>
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
                {filteredInscricoes.map((inscricao) => (
                  <TableRow key={inscricao.id}>
                    <TableCell className="font-medium">{inscricao.nomeCompleto}</TableCell>
                    <TableCell>{inscricao.cpf}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {inscricao.turma.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{new Date(inscricao.dataCriacao).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={statusMap[inscricao.status].color} variant="secondary">
                        {statusMap[inscricao.status].label}
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
                          <DropdownMenuItem onClick={() => handleAction(inscricao.id, 'APROVAR')}>
                            Aprovar Vaga
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(inscricao.id, 'ESPERA')}>
                            Lista de Espera
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleAction(inscricao.id, 'CANCELAR')}
                          >
                            Cancelar Inscrição
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
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
              {actionDialog.type === 'APROVAR' ? 'Aprovar Inscrição' : 'Cancelar Inscrição'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'APROVAR'
                ? 'Defina a data da aula inaugural para confirmar a aprovação.'
                : 'Tem certeza que deseja cancelar esta inscrição?'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'APROVAR' && (
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Data da Aula Inaugural</label>
              <Input type="date" value={dataAula} onChange={(e) => setDataAula(e.target.value)} />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ ...actionDialog, isOpen: false })}
            >
              Voltar
            </Button>
            <Button
              variant={actionDialog.type === 'CANCELAR' ? 'destructive' : 'default'}
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

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
