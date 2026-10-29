import { useState, useEffect, useCallback } from 'react'
import {
  getEventos,
  getInscricoesEvento,
  registrarChamadaEvento,
  exportarEventoExcel,
  type Evento,
  type EventoInscricaoDetalhe,
} from '@/services/eventos'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/components/ui/use-toast'
import {
  CalendarDays,
  Check,
  Download,
  Loader2,
  Save,
  Users,
  X,
  Clock,
} from 'lucide-react'
import { turmaLabels } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [eventoAberto, setEventoAberto] = useState<Evento | null>(null)
  const [inscritas, setInscritas] = useState<EventoInscricaoDetalhe[]>([])
  const [loadingInscritas, setLoadingInscritas] = useState(false)
  const [chamada, setChamada] = useState<Record<string, boolean | null>>({})
  const [salvando, setSalvando] = useState(false)
  const [exportando, setExportando] = useState(false)

  const load = useCallback(async () => {
    try {
      setEventos(await getEventos())
    } catch (err) {
      console.error('Failed to load eventos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('eventos', () => {
    load()
  })

  const abrirEvento = async (evento: Evento) => {
    setEventoAberto(evento)
    setLoadingInscritas(true)
    try {
      const lista = await getInscricoesEvento(evento.id)
      setInscritas(lista)
      const estado: Record<string, boolean | null> = {}
      lista.forEach((i) => {
        estado[i.id] = i.presente
      })
      setChamada(estado)
    } catch {
      toast({ title: 'Erro ao carregar inscritas', variant: 'destructive' })
    } finally {
      setLoadingInscritas(false)
    }
  }

  const salvarChamada = async () => {
    if (!eventoAberto) return
    setSalvando(true)
    try {
      const registros = Object.entries(chamada)
        .filter(([, presente]) => presente !== null)
        .map(([inscricao_id, presente]) => ({ inscricao_id, presente: !!presente }))
      if (registros.length === 0) {
        toast({ title: 'Marque presença ou falta de pelo menos uma inscrita.' })
        return
      }
      await registrarChamadaEvento(eventoAberto.id, registros)
      toast({ title: 'Chamada do evento salva!' })
      load()
    } catch {
      toast({ title: 'Erro ao salvar chamada', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const exportar = async () => {
    if (!eventoAberto) return
    setExportando(true)
    try {
      await exportarEventoExcel(eventoAberto.id, eventoAberto.titulo)
    } catch {
      toast({ title: 'Erro ao exportar planilha', variant: 'destructive' })
    } finally {
      setExportando(false)
    }
  }

  const parseRespostas = (json: string): { pergunta: string; resposta: string }[] => {
    try {
      const arr = JSON.parse(json)
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const ativos = eventos.filter((e) => !e.encerrado)
  const encerrados = eventos.filter((e) => e.encerrado)

  const EventoCard = ({ evento }: { evento: Evento }) => (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      role="button"
      onClick={() => abrirEvento(evento)}
    >
      <CardContent>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{evento.titulo}</span>
              {evento.encerrado ? (
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200">
                  Encerrado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{evento.descricao}</p>
            <div className="text-xs text-muted-foreground">
              <strong>Professores:</strong> {evento.professores?.map((p) => p.nome).join(', ') || '—'}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <CalendarDays className="w-4 h-4" />
              {new Date(evento.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
            {evento.horario_inicio && evento.horario_fim && (
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <Clock className="w-4 h-4" /> {evento.horario_inicio} às {evento.horario_fim}
              </div>
            )}
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <Users className="w-4 h-4" />
              {evento.total_inscritas} inscrita(s)
            </div>
            <div className="mt-1">
              {evento.turma ? (turmaLabels[evento.turma] ?? evento.turma) : 'Todas as turmas'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-primary" /> Eventos
        </h1>
        <p className="text-muted-foreground mt-1">
          Histórico completo de eventos, chamada de comparecimento e exportação.
        </p>
      </div>

      {eventos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum evento criado ainda. Crie eventos pela tela do Mural.
          </CardContent>
        </Card>
      )}

      {ativos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Próximos ({ativos.length})</h2>
          {ativos.map((e) => (
            <EventoCard key={e.id} evento={e} />
          ))}
        </div>
      )}

      {encerrados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Encerrados ({encerrados.length})
          </h2>
          {encerrados.map((e) => (
            <EventoCard key={e.id} evento={e} />
          ))}
        </div>
      )}

      <Dialog open={!!eventoAberto} onOpenChange={(o) => !o && setEventoAberto(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{eventoAberto?.titulo}</DialogTitle>
            <DialogDescription>
              {eventoAberto &&
                `${new Date(eventoAberto.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}${eventoAberto.horario_inicio && eventoAberto.horario_fim ? ` · ${eventoAberto.horario_inicio} às ${eventoAberto.horario_fim}` : ''} · ${
                  eventoAberto.turma
                    ? (turmaLabels[eventoAberto.turma] ?? eventoAberto.turma)
                    : 'Todas as turmas'
                }`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-2" onClick={exportar} disabled={exportando}>
              {exportando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Exportar Excel
            </Button>
            <Button className="gap-2" onClick={salvarChamada} disabled={salvando}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Chamada
            </Button>
          </div>

          {loadingInscritas ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto my-8 text-muted-foreground" />
          ) : inscritas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma aluna inscrita neste evento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluna</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead>Respostas</TableHead>
                  <TableHead className="text-center">Compareceu?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscritas.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.aluna_nome}</TableCell>
                    <TableCell>{turmaLabels[i.turma] ?? i.turma ?? '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-[260px]">
                        {parseRespostas(i.respostas).map((r, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            <strong>{r.pergunta}:</strong> {r.resposta}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={chamada[i.id] === true ? 'default' : 'outline'}
                          className={cn(
                            'gap-1',
                            chamada[i.id] === true &&
                              'bg-emerald-600 hover:bg-emerald-700 text-white',
                          )}
                          onClick={() => setChamada((p) => ({ ...p, [i.id]: true }))}
                        >
                          <Check className="w-3.5 h-3.5" /> Foi
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={chamada[i.id] === false ? 'default' : 'outline'}
                          className={cn(
                            'gap-1',
                            chamada[i.id] === false && 'bg-rose-600 hover:bg-rose-700 text-white',
                          )}
                          onClick={() => setChamada((p) => ({ ...p, [i.id]: false }))}
                        >
                          <X className="w-3.5 h-3.5" /> Não foi
                        </Button>
                      </div>
                    </TableCell>
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
