import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { PerfilUsuario, Usuario } from '@/lib/types'
import api from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
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
import { UserPlus, Loader2, Search, GraduationCap, Users, ShieldCheck, HeartHandshake, BarChart3, MapPin, Trash2, KeyRound, ArrowRightLeft } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
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

const TABS: PerfilUsuario[] = ['ALUNA_FF', 'PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL']

// ─── Listagem ──────────────────────────────────────────────────────────────────

async function listUsers(perfil: PerfilUsuario): Promise<Usuario[]> {
  return api.get<Usuario[]>(`/api/users?perfil=${perfil}`)
}

function UserTable({
  users,
  loading,
  search,
  onDelete,
  onResetPassword,
  onTransfer,
}: {
  users: Usuario[]
  loading: boolean
  search: string
  onDelete?: (user: Usuario) => void
  onResetPassword?: (user: Usuario) => void
  onTransfer?: (user: Usuario) => void
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
            {onTransfer && <TableHead>Núcleo</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Desde</TableHead>
            {(onDelete || onResetPassword || onTransfer) && (
              <TableHead className="w-24 text-center">Ações</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={onTransfer ? 6 : 5} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onTransfer ? 6 : 5} className="h-24 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}</TableCell>
                <TableCell>{u.email}</TableCell>
                {onTransfer && <TableCell>{turmaLabels[u.turma ?? ''] ?? u.turma ?? '—'}</TableCell>}
                <TableCell>
                  {u.ativo ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100" variant="secondary">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-600 hover:bg-gray-200" variant="secondary">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
                {(onDelete || onResetPassword || onTransfer) && (
                  <TableCell className="text-center">
                    {onTransfer && (
                      <Button variant="ghost" size="icon" title="Trocar núcleo" onClick={() => onTransfer(u)}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    )}
                    {onResetPassword && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        title="Redefinir senha"
                        onClick={() => onResetPassword(u)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        title="Excluir usuário"
                        onClick={() => onDelete(u)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function TransferirNucleoDialog({ usuario, onClose, onSuccess }: { usuario: Usuario | null; onClose: () => void; onSuccess: () => void }) {
  const [turma, setTurma] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (usuario) { setTurma(''); setError('') } }, [usuario])

  const transferir = async () => {
    if (!usuario || !turma) return
    setLoading(true)
    try {
      await api.patch(`/api/users/${usuario.id}/nucleo`, { turma })
      toast({ title: 'Aluna transferida!', description: 'As faltas anteriores foram mantidas e as próximas chamadas serão no novo núcleo.' })
      onClose()
      onSuccess()
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Transferir de núcleo</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm">Transferir <strong>{usuario?.name}</strong> para outro núcleo.</p>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">As presenças e faltas anteriores serão mantidas e continuarão contando no histórico da aluna.</div>
          <div className="space-y-2"><Label>Novo núcleo</Label><Select value={turma} onValueChange={setTurma}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{Object.entries(turmaLabels).filter(([key]) => key !== usuario?.turma).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={transferir} disabled={!turma || loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar transferência</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog de exclusão (justificativa obrigatória + auditoria) ────────────────

function ExcluirUsuarioDialog({
  usuario,
  onClose,
  onSuccess,
}: {
  usuario: Usuario | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [justificativa, setJustificativa] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (usuario) {
      setJustificativa('')
      setError('')
    }
  }, [usuario])

  const handleConfirm = async () => {
    if (!usuario) return
    if (!justificativa.trim()) {
      setError('A justificativa é obrigatória para excluir um usuário.')
      return
    }
    setLoading(true)
    try {
      await api.delete(`/api/users/${usuario.id}`, { justificativa: justificativa.trim() })
      toast({ title: 'Usuário excluído.', description: 'A exclusão foi registrada na auditoria.' })
      onClose()
      onSuccess()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Excluir usuário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm">
            Você deseja apagar <strong>{usuario?.name}</strong> ({usuario?.email})?
          </p>
          <div className="space-y-2">
            <Label>
              Justificativa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Descreva o motivo da exclusão (obrigatório)"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="min-h-[90px]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !justificativa.trim()}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog de redefinição de senha (exclusivo da Gestão Geral) ────────────────

function RedefinirSenhaDialog({
  usuario,
  onClose,
}: {
  usuario: Usuario | null
  onClose: () => void
}) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (usuario) {
      setNovaSenha('')
      setConfirmacao('')
      setError('')
    }
  }, [usuario])

  const handleConfirm = async () => {
    if (!usuario) return
    if (novaSenha.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmacao) {
      setError('A confirmação não confere com a nova senha.')
      return
    }
    setLoading(true)
    try {
      await api.post(`/api/users/${usuario.id}/reset-password`, { newPassword: novaSenha })
      toast({
        title: 'Senha redefinida.',
        description: `Informe a nova senha a ${usuario.name} e oriente a troca no primeiro acesso.`,
      })
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Redefinir senha
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm">
            Definir uma nova senha para <strong>{usuario?.name}</strong> ({usuario?.email}).
          </p>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !novaSenha || !confirmacao}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Redefinir senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                    <SelectItem key={key} value={key}>{label}</SelectItem>
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
  const { user } = useApp()
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null)
  const [usuarioParaResetar, setUsuarioParaResetar] = useState<Usuario | null>(null)
  const [usuarioParaTransferir, setUsuarioParaTransferir] = useState<Usuario | null>(null)
  const config = PERFIS[perfil]
  const Icon = config.icon
  // Contas de Gestão Geral não podem ser excluídas (regra 7 do escopo)
  const podeExcluir = user?.perfil === 'GESTAO_GERAL' && perfil !== 'GESTAO_GERAL'
  // Criação de usuários é exclusiva da Gestão Geral — o Administrativo apenas visualiza
  const podeCriar = user?.perfil === 'GESTAO_GERAL'
  // Redefinição de senha: só a Gestão Geral, e nunca sobre outra conta de Gestão Geral
  const podeResetarSenha = user?.perfil === 'GESTAO_GERAL' && perfil !== 'GESTAO_GERAL'
  const podeTransferir = user?.perfil === 'GESTAO_GERAL' && perfil === 'ALUNA_FF'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await listUsers(perfil))
    } finally {
      setLoading(false)
    }
  }, [perfil])

  useEffect(() => { load() }, [load])

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
        {podeCriar && (
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo(a) {config.label}
          </Button>
        )}
      </div>

      <UserTable
        users={users}
        loading={loading}
        search={search}
        onDelete={podeExcluir ? setUsuarioParaExcluir : undefined}
        onResetPassword={podeResetarSenha ? setUsuarioParaResetar : undefined}
        onTransfer={podeTransferir ? setUsuarioParaTransferir : undefined}
      />

      <TransferirNucleoDialog usuario={usuarioParaTransferir} onClose={() => setUsuarioParaTransferir(null)} onSuccess={load} />

      <RedefinirSenhaDialog
        usuario={usuarioParaResetar}
        onClose={() => setUsuarioParaResetar(null)}
      />

      <ExcluirUsuarioDialog
        usuario={usuarioParaExcluir}
        onClose={() => setUsuarioParaExcluir(null)}
        onSuccess={() => {
          load()
          onRefresh?.()
        }}
      />

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
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Consulte os usuários por tipo de acesso ou adicione uma nova conta quando necessário.
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
