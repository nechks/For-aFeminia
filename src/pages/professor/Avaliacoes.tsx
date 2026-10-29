import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMinhasTurmas } from '@/components/turmas/MinhasTurmas'
import {
  getAvaliacoesTurma,
  registrarAvaliacoes,
  type AlunaParaAvaliacao,
} from '@/services/avaliacoes'
import type { MinhaTurma } from '@/services/turmas'
import { formatarDias, turnoLabel } from '@/lib/turmas'
import { getErrorMessage } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Award, CalendarDays, CheckCircle2, Loader2, Save, Sparkles, Users } from 'lucide-react'

const hojeLocal = () => {
  const agora = new Date()
  const y = agora.getFullYear()
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type NotaEmEdicao = { nota: string; feedback: string }

function PainelAvaliacao({ vinculo }: { vinculo: MinhaTurma }) {
  const { toast } = useToast()
  const [data, setData] = useState(hojeLocal)
  const [alunas, setAlunas] = useState<AlunaParaAvaliacao[]>([])
  const [notas, setNotas] = useState<Record<string, NotaEmEdicao>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const resposta = await getAvaliacoesTurma(vinculo.turma.id, data)
      setAlunas(resposta.alunas)
      setNotas(
        Object.fromEntries(
          resposta.alunas.map((aluna) => [
            aluna.user_id,
            {
              nota: aluna.avaliacao ? String(aluna.avaliacao.nota_autoavaliacao) : '',
              feedback: aluna.avaliacao?.feedback_professora ?? '',
            },
          ]),
        ),
      )
    } catch (error) {
      toast({
        title: 'Não foi possível carregar as avaliações',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [data, toast, vinculo.turma.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const preenchidas = useMemo(
    () => Object.values(notas).filter((item) => item.nota !== '').length,
    [notas],
  )

  const alterar = (userId: string, campo: keyof NotaEmEdicao, valor: string) =>
    setNotas((atual) => ({
      ...atual,
      [userId]: { ...atual[userId], [campo]: valor },
    }))

  async function salvar() {
    const registros = alunas
      .filter((aluna) => notas[aluna.user_id]?.nota !== '')
      .map((aluna) => ({
        user_id: aluna.user_id,
        nota_autoavaliacao: Number(notas[aluna.user_id].nota),
        feedback_professora: notas[aluna.user_id].feedback,
      }))
    if (!registros.length) {
      toast({
        title: 'Nenhuma autoavaliação preenchida',
        description: 'Registre a nota de 0 a 10 de ao menos uma aluna antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const resposta = await registrarAvaliacoes(vinculo.turma.id, data, registros)
      toast({
        title: 'Autoavaliações registradas!',
        description: `${resposta.total} ${resposta.total === 1 ? 'aluna registrada' : 'alunas registradas'} em ${new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR')}.`,
      })
      await carregar()
    } catch (error) {
      toast({
        title: 'Não foi possível salvar',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card className="border-primary/15 shadow-md">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-[hsl(var(--fundo-rosa))] to-[hsl(var(--fundo-pessego))]">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Award className="h-5 w-5" /> {vinculo.turma.nome}
          </span>
          <Badge className="bg-primary text-primary-foreground">
            {preenchidas}/{alunas.length} registradas
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {vinculo.nucleo_nome} · {turnoLabel(vinculo.turma.turno)} ·{' '}
          {formatarDias(vinculo.turma.dias_semana) || 'dias não definidos'}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/25 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xs space-y-1.5">
            <Label htmlFor={`data-${vinculo.turma.id}`}>Data da autoavaliação</Label>
            <Input
              id={`data-${vinculo.turma.id}`}
              type="date"
              value={data}
              max={hojeLocal()}
              onChange={(event) => setData(event.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1.5 inline h-4 w-4 text-laranja-texto" />
            Registre a nota que cada aluna deu a si mesma. Ela verá o registro no painel dela.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : alunas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma aluna aprovada nesta turma.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {alunas.map((aluna) => {
              const edicao = notas[aluna.user_id] ?? { nota: '', feedback: '' }
              const notaNumerica = edicao.nota === '' ? 0 : Number(edicao.nota)
              const registrada = aluna.avaliacao != null
              const comReflexao = Boolean(aluna.avaliacao?.reflexao_aluna?.trim())
              return (
                <div
                  key={aluna.user_id}
                  className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{aluna.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">
                        {!registrada
                          ? 'Autoavaliação ainda não registrada nesta data'
                          : comReflexao
                            ? 'Autoavaliação registrada · reflexão escrita pela aluna'
                            : 'Autoavaliação registrada · aguardando a reflexão da aluna'}
                      </p>
                    </div>
                    {registrada && (
                      <Badge variant="secondary" className="gap-1 text-secondary-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Registrada
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`nota-${aluna.user_id}`}>Autoavaliação da aluna</Label>
                        <span className="text-lg font-bold text-primary">
                          {edicao.nota === '' ? '—' : notaNumerica.toLocaleString('pt-BR')}
                          <span className="text-xs font-normal text-muted-foreground">/10</span>
                        </span>
                      </div>
                      <Input
                        id={`nota-${aluna.user_id}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={edicao.nota}
                        onChange={(event) => alterar(aluna.user_id, 'nota', event.target.value)}
                        placeholder="Nota de 0 a 10 informada pela aluna"
                      />
                      <Progress
                        value={Math.min(100, Math.max(0, notaNumerica * 10))}
                        className="h-2"
                        indicatorClassName="bg-marca"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`feedback-${aluna.user_id}`}>Feedback para a aluna</Label>
                      <Textarea
                        id={`feedback-${aluna.user_id}`}
                        value={edicao.feedback}
                        onChange={(event) => alterar(aluna.user_id, 'feedback', event.target.value)}
                        placeholder="Reconheça os avanços e indique o próximo ponto de evolução..."
                        className="min-h-24 resize-y"
                        maxLength={2000}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {alunas.length > 0 && !loading && (
          <div className="sticky bottom-4 flex justify-end">
            <Button onClick={salvar} disabled={salvando || preenchidas === 0} className="gap-2 shadow-lg">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar autoavaliações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Avaliacoes() {
  const { turmas, loading } = useMinhasTurmas()
  const turmasDeDefesa = turmas.filter(
    (vinculo) => vinculo.tipo_profissional === 'PROFESSORA_DEFESA_PESSOAL',
  )
  const [ativa, setAtiva] = useState('')

  useEffect(() => {
    if (turmasDeDefesa.length && !turmasDeDefesa.some((v) => v.turma.id === ativa)) {
      setAtiva(turmasDeDefesa[0].turma.id)
    }
  }, [ativa, turmasDeDefesa])

  if (loading) {
    return <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-primary" />
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-menu p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[hsl(var(--rosa))]/30 blur-2xl" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-[hsl(var(--laranja))]/30 blur-2xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-white/75">
            <Sparkles className="h-4 w-4 text-[hsl(var(--laranja))]" />
            Acompanhamento formativo
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Autoavaliação das alunas</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            Quem se dá a nota é a aluna: nas aulas de Defesa Pessoal ela avalia a própria evolução
            e você registra aqui o valor informado, junto do seu feedback.
          </p>
        </div>
      </div>

      {!turmasDeDefesa.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Award className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Nenhuma turma disponível para autoavaliação.</p>
            <p className="max-w-lg text-sm text-muted-foreground">
              Esta função é exclusiva para quem está vinculada à turma como Professora de Defesa
              Pessoal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={ativa} onValueChange={setAtiva} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {turmasDeDefesa.map((vinculo) => (
              <TabsTrigger key={vinculo.turma.id} value={vinculo.turma.id}>
                {vinculo.turma.nome}
                <span className="ml-1.5 text-xs opacity-70">· {vinculo.nucleo_nome}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {turmasDeDefesa.map((vinculo) => (
            <TabsContent key={vinculo.turma.id} value={vinculo.turma.id}>
              <PainelAvaliacao vinculo={vinculo} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
