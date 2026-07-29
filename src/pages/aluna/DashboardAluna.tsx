import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { getDashboardForcaFeminina } from '@/services/dashboard'
import {
  getEventos,
  inscreverNoEvento,
  type Evento,
  type RespostaEvento,
} from '@/services/eventos'
import { getErrorMessage } from '@/lib/api/errors'
import { DashboardData } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Calendar as CalendarIcon,
  CalendarDays,
  MapPin,
  Bell,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { turmaLabels } from '@/lib/constants'
import { fileUrl } from '@/lib/api/client'
import { toast } from '@/components/ui/use-toast'

export default function DashboardAluna() {
  const { user, minhaConfirmacao, isAuthenticated } = useApp()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoInscricao, setEventoInscricao] = useState<Evento | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [inscrevendo, setInscrevendo] = useState(false)
  const [erroInscricao, setErroInscricao] = useState('')

  const loadEventos = useCallback(async () => {
    try {
      setEventos(await getEventos())
    } catch (err) {
      console.error('Failed to load eventos:', err)
    }
  }, [])

  useEffect(() => {
    loadEventos()
  }, [loadEventos])

  useRealtime('eventos', () => loadEventos(), isAuthenticated)

  const abrirInscricaoEvento = (evento: Evento) => {
    setEventoInscricao(evento)
    setRespostas({})
    setErroInscricao('')
  }

  const handleInscrever = async () => {
    if (!eventoInscricao) return
    const lista: RespostaEvento[] = eventoInscricao.perguntas.map((p) => ({
      pergunta: p.pergunta,
      resposta: (respostas[p.id] ?? '').trim(),
    }))
    if (lista.some((r) => !r.resposta)) {
      setErroInscricao('Responda todas as perguntas para se inscrever.')
      return
    }
    setInscrevendo(true)
    try {
      await inscreverNoEvento(eventoInscricao.id, lista)
      toast({ title: 'Inscrição confirmada!', description: 'Nos vemos no evento 💜' })
      setEventoInscricao(null)
      loadEventos()
    } catch (err) {
      setErroInscricao(getErrorMessage(err))
    } finally {
      setInscrevendo(false)
    }
  }
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardForcaFeminina()
      setDashboard(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useRealtime(
    'presenca',
    () => {
      loadDashboard()
    },
    isAuthenticated,
  )

  useRealtime(
    'mural',
    () => {
      loadDashboard()
    },
    isAuthenticated,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const precisaPreencherFicha = !minhaConfirmacao

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-primary/30">
          {user?.avatar && (
            <AvatarImage src={fileUrl(user.avatar)} alt="Foto de perfil" />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {(user?.nomeSocial || user?.name || '?')
              .split(' ')
              .slice(0, 2)
              .map((p: string) => p[0])
              .join('')
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {user?.nomeSocial?.split(' ')[0] ?? dashboard?.nome?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Aluna'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vinda ao seu painel do Projeto Força Feminina.
          </p>
        </div>
      </div>

      {precisaPreencherFicha && (
        <Card className="bg-secondary/10 border-secondary/20 shadow-sm animate-slide-up">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-secondary/20 p-3 rounded-full mt-1">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ação Necessária: Ficha de Confirmação</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você foi aprovada! Para garantir sua vaga, preencha o questionário completo.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 bg-secondary hover:bg-secondary/90">
              <Link to="/aluna/ficha">
                Preencher Agora <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seu Progresso</CardTitle>
              <CardDescription>Acompanhe sua frequência nas aulas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="10"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className="text-secondary stroke-current"
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 56}
                      strokeDashoffset={
                        2 * Math.PI * 56 * (1 - (dashboard?.percentualFrequencia ?? 0) / 100)
                      }
                      strokeLinecap="round"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {(dashboard?.percentualFrequencia ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Aulas Assistidas: <strong>{dashboard?.aulasAssistidas ?? 0}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Total: <strong>{dashboard?.totalAulas ?? 0}</strong>
                    </span>
                  </div>
                  <Progress
                    value={dashboard?.percentualFrequencia ?? 0}
                    className="h-2 bg-muted"
                    indicatorClassName="bg-secondary"
                  />
                  <p className="text-sm text-muted-foreground">
                    Continue assim! A presença regular é essencial para o certificado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mural de Avisos</CardTitle>
                <CardDescription>Comunicações da coordenação</CardDescription>
              </div>
              <Bell className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {(dashboard?.avisos ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum aviso no momento.
                </p>
              ) : (
                (dashboard?.avisos ?? []).map((aviso) => (
                  <div
                    key={aviso.id}
                    className="p-4 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {aviso.turma ? (
                        <span className="text-xs font-medium text-primary px-2 py-1 bg-primary/10 rounded-full">
                          {turmaLabels[aviso.turma] ?? aviso.turma}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-secondary px-2 py-1 bg-secondary/10 rounded-full">
                          Geral
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {aviso.data_publicacao
                          ? new Date(aviso.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                          : ''}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm">{aviso.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{aviso.conteudo}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {eventos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> Eventos
                </CardTitle>
                <CardDescription>Inscreva-se nos próximos eventos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventos.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-lg border bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm">{ev.titulo}</h4>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(ev.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ev.descricao}</p>
                    {ev.horario_inicio && ev.horario_fim && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {ev.horario_inicio} às {ev.horario_fim}
                      </div>
                    )}
                    {ev.minha_inscricao ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inscrita
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => abrirInscricaoEvento(ev)}
                      >
                        Inscrever-se <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Próxima Aula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-card rounded-lg border p-4 text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-semibold text-lg text-primary">Sábado, 20/06</div>
                <div className="text-sm font-medium">14:00 - 16:30</div>
                <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                  <MapPin className="w-3 h-3 mr-1" /> Centro, Vitória
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sua Turma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <CheckCircle2 className="w-4 h-4 text-secondary mr-2" />
                  <span className="font-medium">
                    {turmaLabels[dashboard?.turma ?? ''] ??
                      ((dashboard?.turma ?? '').replace(/_/g, ' ') || '—')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Frequência:{' '}
                  <strong className="text-emerald-600">
                    {(dashboard?.percentualFrequencia ?? 0).toFixed(1)}%
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de inscrição no evento: todas as perguntas são obrigatórias */}
      <Dialog open={!!eventoInscricao} onOpenChange={(o) => !o && setEventoInscricao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{eventoInscricao?.titulo}</DialogTitle>
            <DialogDescription>
              Responda às perguntas abaixo para confirmar sua inscrição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {eventoInscricao?.perguntas.map((p) => (
              <div key={p.id} className="space-y-2">
                <Label>{p.pergunta}</Label>
                {p.opcoes && p.opcoes.length > 0 ? (
                  <RadioGroup
                    value={respostas[p.id] ?? ''}
                    onValueChange={(v) => setRespostas((r) => ({ ...r, [p.id]: v }))}
                    className="gap-2"
                  >
                    {p.opcoes.map((opcao, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <RadioGroupItem value={opcao} id={`${p.id}-${idx}`} />
                        <Label htmlFor={`${p.id}-${idx}`} className="font-normal cursor-pointer">
                          {opcao}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  // Perguntas de eventos antigos (sem alternativas) seguem em texto livre
                  <Textarea
                    className="min-h-[60px]"
                    value={respostas[p.id] ?? ''}
                    onChange={(e) =>
                      setRespostas((r) => ({ ...r, [p.id]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
            {erroInscricao && <p className="text-sm text-destructive">{erroInscricao}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventoInscricao(null)}>
              Cancelar
            </Button>
            <Button onClick={handleInscrever} disabled={inscrevendo}>
              {inscrevendo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar inscrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
