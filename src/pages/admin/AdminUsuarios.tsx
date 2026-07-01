import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { PerfilUsuario, Usuario } from '@/lib/types'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  UserPlus,
  Loader2,
  Search,
  GraduationCap,
  Users,
  ShieldCheck,
  HeartHandshake,
  BarChart3,
  MapPin,
} from 'lucide-react'
import { turmaLabels } from '@/lib/constants'
import { toast } from '@/components/ui/use-toast'

// ─── Configuração dos perfis ───────────────────────────────────────────────────

interface PerfilConfig {
  label: string
  descricao: string
  icon: React.ElementType
  cor: string
}

const PERFIS: Record<PerfilUsuario, PerfilConfig> = {
  ALUNA_FF: {
    label: 'Aluna',
    descricao: 'Acessa seu painel, ficha de confirmação, calendário e mural.',
    icon: GraduationCap,
    cor: 'text-pink-600 bg-pink-50',
  },
  PROFESSOR: {
    label: 'Professor(a)',
    descricao: 'Registra chamada das aulas e gerencia atendimentos.',
    icon: Users,
    cor: 'text-blue-600 bg-blue-50',
  },
  ADMINISTRATIVO: {
    label: 'Administrativo',
    descricao: 'Gerencia inscrições, usuários, mural e dashboard administrativo.',
    icon: ShieldCheck,
    cor: 'text-purple-600 bg-purple-50',
  },
  ASSISTENTE_SOCIAL: {
    label: 'Assistente Social',
    descricao: 'Acessa inscrições e atendimentos das alunas.',
    icon: HeartHandshake,
    cor: 'text-emerald-600 bg-emerald-50',
  },
  GESTAO_GERAL: {
    label: 'Gestão Geral',
    descricao: 'Acesso completo: indicadores, inscrições, usuários, mural e atendimentos.',
    icon: BarChart3,
    cor: 'text-orange-600 bg-orange-50',
  },
}

const TABS: PerfilUsuario[] = [
  'ALUNA_FF',
  'PROFESSOR',
  'ADMINISTRATIVO',
  'ASSISTENTE_SOCIAL',
  'GESTAO_GERAL',
]

// ─── Listagem ──────────────────────────────────────────────────────────────────

async function listUsers(perfil: PerfilUsuario): Promise<Usuario[]> {
  const records = await pb.collection('users').getFullList({
    filter: `perfil = "${perfil}"`,
    sort: 'name',
  })
  return records as unknown as Usuario[]
}

function UserTable({
  users,
  loading,
  search,
}: {
  users: Usuario[]
  loading: boolean
  search: string
}) {
  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Desde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {u.ativo ? (
                    <Badge
                      className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      variant="secondary"
                    >
                      Ativo
                    </Badge>
                  ) : (
                    <Badge
                      className="bg-gray-200 text-gray-600 hover:bg-gray-200"
                      variant="secondary"
                    >
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Dialog de criação ─────────────────────────────────────────────────────────

function NovoUsuarioDialog({
  open,
  perfilInicial,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  perfilInicial: PerfilUsuario
  onOpenChange: (v: boolean) => void
  onSuccess: (perfil: PerfilUsuario) => void
}) {
  const { signUp } = useApp()
  const [perfil, setPerfil] = useState<PerfilUsuario>(perfilInicial)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turma, setTurma] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPerfil(perfilInicial)
      setTurma('')
    }
  }, [open, perfilInicial])

  const perfilSelecionado = PERFIS[perfil]
  const Icon = perfilSelecionado.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (perfil === 'PROFESSOR' && !turma) {
      setError('Selecione a turma do professor.')
      return
    }
    setLoading(true)
    const { error: err } = await signUp(name, email, password, perfil, turma || undefined)
    setLoading(false)
    if (err) {
      setError(getErrorMessage(err))
      return
    }
    toast({ title: `${perfilSelecionado.label} cadastrado(a) com sucesso!` })
    setName('')
    setEmail('')
    setPassword('')
    setTurma('')
    onOpenChange(false)
    onSuccess(perfil)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seleção de perfil */}
          <div className="space-y-2">
            <Label>Tipo de acesso</Label>
            <Select value={perfil} onValueChange={(v) => setPerfil(v as PerfilUsuario)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PERFIS[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Card descritivo do perfil */}
            <div className={`flex items-start gap-3 rounded-md p-3 mt-1 ${perfilSelecionado.cor}`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs">{perfilSelecionado.descricao}</p>
            </div>
          </div>

          {/* Turma — obrigatória apenas para Professor */}
          {perfil === 'PROFESSOR' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Turma responsável
              </Label>
              <Select value={turma} onValueChange={setTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(turmaLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab por perfil ────────────────────────────────────────────────────────────

function UserTab({ perfil, onRefresh }: { perfil: PerfilUsuario; onRefresh?: () => void }) {
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const config = PERFIS[perfil]
  const Icon = config.icon

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await listUsers(perfil))
    } finally {
      setLoading(false)
    }
  }, [perfil])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 rounded-lg p-3 ${config.cor}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <p className="text-sm">{config.descricao}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar ${config.label.toLowerCase()}...`}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo(a) {config.label}
        </Button>
      </div>

      <UserTable users={users} loading={loading} search={search} />

      <NovoUsuarioDialog
        open={dialogOpen}
        perfilInicial={perfil}
        onOpenChange={setDialogOpen}
        onSuccess={(p) => {
          if (p === perfil) load()
          onRefresh?.()
        }}
      />
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function AdminUsuarios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie todos os usuários do sistema por tipo de acesso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Usuários</CardTitle>
          <CardDescription>
            Cada tipo de usuário tem acesso a funcionalidades específicas do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ALUNA_FF">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {TABS.map((p) => (
                <TabsTrigger key={p} value={p}>
                  {PERFIS[p].label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((p) => (
              <TabsContent key={p} value={p}>
                <UserTab perfil={p} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
