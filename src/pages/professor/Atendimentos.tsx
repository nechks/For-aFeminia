import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { Atendimento } from '@/lib/types'
import { getAtendimentos, deletarAtendimento } from '@/services/atendimentos'
import { turmaLabels, getTipoAtendimentoLabel } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { NovoAtendimentoDialog } from '@/components/atendimentos/NovoAtendimentoDialog'
import { Plus, Trash2, Eye, Loader2, ClipboardList } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const PODE_CRIAR = ['ASSISTENTE_SOCIAL', 'ADMINISTRATIVO', 'GESTAO_GERAL']
const PODE_EXCLUIR = ['ADMINISTRATIVO', 'GESTAO_GERAL']

export default function Atendimentos() {
  const { user, isAuthenticated } = useApp()
  const [lista, setLista] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detalhe, setDetalhe] = useState<Atendimento | null>(null)
  const [deletarId, setDeletarId] = useState<string | null>(null)

  const podeCriar = user && PODE_CRIAR.includes(user.perfil)
  const podeExcluir = user && PODE_EXCLUIR.includes(user.perfil)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAtendimentos()
      setLista(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime(
    'atendimentos',
    () => {
      load()
    },
    isAuthenticated,
  )

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atendimentos</h1>
          <p className="text-muted-foreground mt-1">
            Registros de atendimentos realizados pela equipe profissional.
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
            Registros de atendimentos sociais vinculados a alunas e seus respectivos núcleos.
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
                const turmaLabel = turmaLabels[a.turma] ?? a.turma
                const alunaName = a.expand?.aluna_id?.name ?? '—'
                const profissionalName = a.expand?.profissional_id?.name ?? '—'
                return (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {turmaLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getTipoAtendimentoLabel(a.tipo)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.data_atendimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · por {profissionalName}
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        Aluna:{' '}
                        <span className="text-muted-foreground font-normal">{alunaName}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{a.descricao}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setDetalhe(a)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {podeExcluir && (
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

      <NovoAtendimentoDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={load} />

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Atendimento Social
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>
                  <strong>Data:</strong>{' '}
                  {new Date(detalhe.data_atendimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
                <span>·</span>
                <span>
                  <strong>Núcleo:</strong> {turmaLabels[detalhe.turma] ?? detalhe.turma}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  <strong>Aluna:</strong> {detalhe.expand?.aluna_id?.name ?? '—'}
                </span>
                <span>
                  <strong>Profissional:</strong> {detalhe.expand?.profissional_id?.name ?? '—'}
                </span>
                <span>
                  <strong>Tipo:</strong> {getTipoAtendimentoLabel(detalhe.tipo)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Descrição:</p>
                <div className="rounded-md bg-muted/50 border p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {detalhe.descricao}
                </div>
              </div>
              {detalhe.encaminhamento && (
                <div>
                  <p className="text-sm font-medium mb-1">Encaminhamento:</p>
                  <div className="rounded-md bg-muted/50 border p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {detalhe.encaminhamento}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalhe(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletarId} onOpenChange={(o) => !o && setDeletarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
