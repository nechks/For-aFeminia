import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { Atendimento, TipoAcessoAtendimento } from '@/lib/types'
import {
  getAtendimentos,
  getAlunasPorTurma,
  criarAtendimento,
  deletarAtendimento,
  AlunaOpcao,
} from '@/services/atendimentos'
import { turmaLabels, nucleosCadastrados } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Lock, Globe, Trash2, Eye, Loader2, ClipboardList } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const PODE_CRIAR = ['PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL']

interface NovoAtendimentoForm {
  data: string
  horario: string
  tipo_acesso: TipoAcessoAtendimento
  relatorio: string
  turma: string
  aluna_id: string
}

const formVazio = (): NovoAtendimentoForm => ({
  data: new Date().toISOString().split('T')[0],
  horario: '',
  tipo_acesso: 'PUBLICO',
  relatorio: '',
  turma: '',
  aluna_id: '',
})

function DetalheDialog({
  atendimento,
  onClose,
}: {
  atendimento: Atendimento | null
  onClose: () => void
}) {
  if (!atendimento) return null
  const autor = atendimento.expand?.created_by?.name ?? '—'
  const alunaName = atendimento.expand?.aluna_id?.name ?? '—'
  const turmaLabel = turmaLabels[atendimento.turma] ?? atendimento.turma

  return (
    <Dialog open={!!atendimento} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Relatório de Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground">
              <strong>Data:</strong>{' '}
              {new Date(atendimento.data + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              <strong>Horário:</strong> {atendimento.horario}
            </span>
            {turmaLabel && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  <strong>Turma:</strong> {turmaLabel}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><strong>Aluna:</strong> {alunaName}</span>
            <span><strong>Registrado por:</strong> {autor}</span>
          </div>
          <div className="rounded-md bg-muted/50 border p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {atendimento.relatorio}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NovoAtendimentoDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const { user } = useApp()
  const [form, setForm] = useState<NovoAtendimentoForm>(formVazio())
  const [alunas, setAlunas] = useState<AlunaOpcao[]>([])
  const [loadingAlunas, setLoadingAlunas] = useState(false)
  const [loading, setLoading] = useState(false)

  // Regra 9.1 do escopo: professor(a) só atende alunas do próprio núcleo
  const turmaFixa = user?.perfil === 'PROFESSOR' ? (user.turma ?? '') : ''

  const set = (field: keyof NovoAtendimentoForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  useEffect(() => {
    if (open && turmaFixa && form.turma !== turmaFixa) {
      handleTurmaChange(turmaFixa)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, turmaFixa])

  const handleTurmaChange = async (turma: string) => {
    setForm((f) => ({ ...f, turma, aluna_id: '' }))
    setAlunas([])
    if (!turma) return
    setLoadingAlunas(true)
    try {
      const lista = await getAlunasPorTurma(turma)
      setAlunas(lista)
    } catch {
      toast({ title: 'Erro ao carregar alunas', variant: 'destructive' })
    } finally {
      setLoadingAlunas(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      await criarAtendimento(user.id, {
        data: form.data,
        horario: form.horario,
        tipo_acesso: form.tipo_acesso,
        relatorio: form.relatorio,
        turma: form.turma,
        aluna_id: form.aluna_id,
      })
      toast({ title: 'Atendimento registrado!' })
      setForm(formVazio())
      setAlunas([])
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao registrar atendimento', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Atendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) => set('data', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário</label>
              <Input
                type="time"
                value={form.horario}
                onChange={(e) => set('horario', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Turma</label>
            {turmaFixa ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium">
                {turmaLabels[turmaFixa] ?? turmaFixa}
                <span className="text-xs text-muted-foreground">(seu núcleo)</span>
              </div>
            ) : (
              <Select value={form.turma} onValueChange={handleTurmaChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {nucleosCadastrados.map(({ codigo, nome }) => (
                    <SelectItem key={codigo} value={codigo}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Aluna</label>
            <Select
              value={form.aluna_id}
              onValueChange={(v) => set('aluna_id', v)}
              disabled={!form.turma || loadingAlunas}
              required
            >
              <SelectTrigger>
                {loadingAlunas ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                  </span>
                ) : (
                  <SelectValue placeholder={form.turma ? 'Selecione a aluna...' : 'Selecione a turma primeiro'} />
                )}
              </SelectTrigger>
              <SelectContent>
                {alunas.length === 0 && !loadingAlunas ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nenhuma aluna aprovada nesta turma.
                  </div>
                ) : (
                  alunas.map((a) => (
                    <SelectItem key={a.userId} value={a.userId}>
                      {a.nomeCompleto}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Visibilidade</label>
            <Select
              value={form.tipo_acesso}
              onValueChange={(v) => set('tipo_acesso', v as TipoAcessoAtendimento)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLICO">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-500" /> Público
                  </div>
                </SelectItem>
                <SelectItem value="CONFIDENCIAL">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-500" /> Confidencial
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {form.tipo_acesso === 'CONFIDENCIAL' && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Este relatório será visível apenas para você.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Relatório</label>
            <Textarea
              placeholder="Descreva o atendimento realizado..."
              className="min-h-[140px] resize-none"
              value={form.relatorio}
              onChange={(e) => set('relatorio', e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.aluna_id}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Atendimentos() {
  const { user, isAuthenticated } = useApp()
  const [lista, setLista] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detalhe, setDetalhe] = useState<Atendimento | null>(null)
  const [deletarId, setDeletarId] = useState<string | null>(null)

  const podeCriar = user && PODE_CRIAR.includes(user.perfil)

  /** `silencioso`: a recarga automática não troca a lista por um spinner (evita o piscar). */
  const load = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const data = await getAtendimentos()
      setLista(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime('atendimentos', () => { load(true) }, isAuthenticated)

  const handleDeletar = async () => {
    if (!deletarId) return
    try {
      await deletarAtendimento(deletarId)
      toast({ title: 'Atendimento excluído' })
      setDeletarId(null)
      load()
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const ehMeuRegistro = (a: Atendimento) => a.created_by === user?.id
  const podeExcluir = (a: Atendimento) =>
    ehMeuRegistro(a) ||
    user?.perfil === 'ADMINISTRATIVO' ||
    user?.perfil === 'GESTAO_GERAL'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atendimentos</h1>
          <p className="text-muted-foreground mt-1">
            Registros de atendimentos realizados pela equipe.
          </p>
        </div>
        {podeCriar && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Atendimento
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atendimentos</CardTitle>
          <CardDescription>
            Registros públicos são visíveis a todos. Confidenciais são visíveis apenas ao autor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lista.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 space-y-2">
              <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
              <p>Nenhum atendimento registrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lista.map((a) => {
                const isConfidencial = a.tipo_acesso === 'CONFIDENCIAL'
                const meu = ehMeuRegistro(a)
                const turmaLabel = turmaLabels[a.turma] ?? a.turma
                const autor = a.expand?.created_by?.name ?? '—'
                const alunaName = a.expand?.aluna_id?.name ?? '—'

                return (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            isConfidencial
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                          }
                        >
                          {isConfidencial ? (
                            <><Lock className="h-3 w-3 mr-1" /> Confidencial</>
                          ) : (
                            <><Globe className="h-3 w-3 mr-1" /> Público</>
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{turmaLabel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {a.horario}
                        </span>
                        <span className="text-xs text-muted-foreground">· por {autor}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <span className="text-muted-foreground text-xs">Aluna:</span>
                        <span className="text-xs">{alunaName}</span>
                      </div>
                      {isConfidencial && !meu ? (
                        <p className="text-sm text-muted-foreground italic">
                          Conteúdo confidencial — visível somente ao autor.
                        </p>
                      ) : (
                        <p className="text-sm text-foreground line-clamp-2">{a.relatorio}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(!isConfidencial || meu) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setDetalhe(a)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {podeExcluir(a) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletarId(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NovoAtendimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={load}
      />

      <DetalheDialog atendimento={detalhe} onClose={() => setDetalhe(null)} />

      <AlertDialog open={!!deletarId} onOpenChange={(o) => !o && setDeletarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeletar}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
