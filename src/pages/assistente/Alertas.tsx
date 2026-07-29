import { useState, useEffect, useCallback } from 'react'
import { getAlertas, resolverAlerta, type Alerta } from '@/services/alertas'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { AlertTriangle, CheckCircle2, Loader2, PhoneCall } from 'lucide-react'
import { turmaLabels } from '@/lib/constants'

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvendo, setResolvendo] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setAlertas(await getAlertas())
    } catch (err) {
      console.error('Failed to load alertas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('alertas', () => {
    load()
  })

  const handleResolver = async (id: string) => {
    setResolvendo(id)
    try {
      await resolverAlerta(id)
      toast({ title: 'Alerta marcado como resolvido.' })
      await load()
    } catch {
      toast({ title: 'Erro ao resolver alerta', variant: 'destructive' })
    } finally {
      setResolvendo(null)
    }
  }

  const abertos = alertas.filter((a) => a.status === 'ABERTO')
  const resolvidos = alertas.filter((a) => a.status === 'RESOLVIDO')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const nivelAlerta = (faltas: number) => {
    if (faltas >= 3) return { nome: 'Contato urgente', borda: 'border-rose-500', badge: 'bg-rose-100 text-rose-800', icone: 'text-rose-600', mensagem: 'Entre em contato com a aluna com urgência.' }
    if (faltas === 2) return { nome: 'Perigoso', borda: 'border-orange-400', badge: 'bg-orange-100 text-orange-800', icone: 'text-orange-500', mensagem: 'A situação exige atenção e contato com a aluna.' }
    return { nome: 'Moderado', borda: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', icone: 'text-amber-500', mensagem: 'Acompanhe a situação da aluna.' }
  }

  const AlertaCard = ({ alerta }: { alerta: Alerta }) => {
    const nivel = nivelAlerta(alerta.faltas_sem_justificativa)
    return <Card className={alerta.status === 'ABERTO' ? nivel.borda : 'opacity-70'}>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTriangle
                className={`w-5 h-5 ${alerta.status === 'ABERTO' ? nivel.icone : 'text-muted-foreground'}`}
              />
              <span className="font-semibold">{alerta.aluna_nome}</span>
              <Badge variant="secondary">
                {turmaLabels[alerta.turma] ?? alerta.turma ?? 'Sem turma'}
              </Badge>
              <Badge className={nivel.badge} variant="secondary">{nivel.nome}</Badge>
              {alerta.status === 'ABERTO' ? (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100" variant="secondary">
                  Aberto
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100" variant="secondary">
                  Resolvido
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>{alerta.faltas_sem_justificativa}</strong> falta(s) sem justificativa. {nivel.mensagem}
            </p>
            {alerta.datas && (
              <p className="text-xs text-muted-foreground">
                Datas:{' '}
                {alerta.datas
                  .split(',')
                  .map((d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'))
                  .join(', ')}
              </p>
            )}
          </div>
          {alerta.status === 'ABERTO' && (
            <Button
              variant="outline"
              className="gap-2 shrink-0"
              disabled={resolvendo === alerta.id}
              onClick={() => handleResolver(alerta.id)}
            >
              {resolvendo === alerta.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Marcar como contatada
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <PhoneCall className="w-7 h-7 text-primary" /> Alertas
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhamento progressivo desde a primeira falta sem justificativa.
        </p>
      </div>

      {abertos.length === 0 && resolvidos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum alerta no momento. Tudo em dia! 💜
          </CardContent>
        </Card>
      )}

      {abertos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Abertos ({abertos.length})</h2>
          {abertos.map((a) => (
            <AlertaCard key={a.id} alerta={a} />
          ))}
        </div>
      )}

      {resolvidos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Resolvidos ({resolvidos.length})
          </h2>
          {resolvidos.map((a) => (
            <AlertaCard key={a.id} alerta={a} />
          ))}
        </div>
      )}
    </div>
  )
}
