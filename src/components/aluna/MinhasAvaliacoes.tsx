import { useEffect, useMemo, useState } from 'react'
import {
  getMinhasAvaliacoes,
  salvarReflexao,
  type AvaliacaoAluna,
} from '@/services/avaliacoes'
import { getErrorMessage } from '@/lib/api/errors'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Award,
  BookHeart,
  CheckCircle2,
  Loader2,
  MessageCircleHeart,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

const formatarNota = (nota?: number | null) =>
  nota == null ? '—' : nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const formatarData = (data: string) =>
  new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

function CirculoNota({ nota, rotulo, cor }: { nota?: number | null; rotulo: string; cor: string }) {
  const percentual = Math.min(100, Math.max(0, (nota ?? 0) * 10))
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="grid h-20 w-20 place-items-center rounded-full p-[6px] shadow-sm"
        style={{ background: `conic-gradient(${cor} ${percentual}%, hsl(var(--muted)) 0)` }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-card">
          <span className="text-xl font-bold">
            {formatarNota(nota)}
            <span className="text-[10px] font-normal text-muted-foreground">/10</span>
          </span>
        </div>
      </div>
      <span className="text-center text-xs text-muted-foreground">{rotulo}</span>
    </div>
  )
}

/**
 * A nota já é da aluna — ela se avalia na aula e a professora apenas registra o valor. Aqui ela
 * acrescenta somente a reflexão escrita sobre a própria evolução.
 */
function ReflexaoForm({
  avaliacao,
  aoSalvar,
}: {
  avaliacao: AvaliacaoAluna
  aoSalvar: (atualizada: AvaliacaoAluna) => void
}) {
  const { toast } = useToast()
  const [reflexao, setReflexao] = useState(avaliacao.reflexao_aluna ?? '')
  const [salvando, setSalvando] = useState(false)
  const jaEscreveu = Boolean(avaliacao.reflexao_aluna?.trim())

  async function salvar() {
    if (!reflexao.trim()) {
      toast({
        title: 'Escreva sua reflexão',
        description: 'Conte o que você percebeu antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const atualizada = await salvarReflexao(avaliacao.id, reflexao)
      aoSalvar(atualizada)
      toast({
        title: 'Reflexão salva!',
        description: 'Sua percepção agora faz parte do acompanhamento da sua evolução.',
      })
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
    <div className="mt-4 space-y-4 rounded-xl border border-[hsl(var(--rosa))]/20 bg-[hsl(var(--fundo-rosa))]/60 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-secondary-foreground">
          <BookHeart className="h-4 w-4" /> O que você percebeu na sua evolução?
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A nota acima é a que você mesma se deu nesta aula.
        </p>
      </div>
      <Textarea
        value={reflexao}
        onChange={(event) => setReflexao(event.target.value)}
        placeholder="Conte o que você percebeu de avanço e o que ainda deseja desenvolver..."
        className="min-h-24 bg-card"
        maxLength={2000}
      />
      <Button onClick={salvar} disabled={salvando} className="w-full gap-2 sm:w-auto">
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {jaEscreveu ? 'Atualizar reflexão' : 'Salvar reflexão'}
      </Button>
    </div>
  )
}

export default function MinhasAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAluna[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let ativo = true
    getMinhasAvaliacoes()
      .then((lista) => ativo && setAvaliacoes(lista))
      .catch((error) =>
        toast({
          title: 'Não foi possível carregar suas autoavaliações',
          description: getErrorMessage(error),
          variant: 'destructive',
        }),
      )
      .finally(() => ativo && setLoading(false))
    return () => {
      ativo = false
    }
  }, [toast])

  const resumo = useMemo(() => {
    const media = avaliacoes.length
      ? avaliacoes.reduce((total, item) => total + item.nota_autoavaliacao, 0) / avaliacoes.length
      : 0
    const comReflexao = avaliacoes.filter((item) => Boolean(item.reflexao_aluna?.trim()))
    const primeira = avaliacoes.at(-1)?.nota_autoavaliacao
    const atual = avaliacoes[0]?.nota_autoavaliacao
    return {
      media,
      reflexoes: comReflexao.length,
      evolucao: primeira == null || atual == null ? null : atual - primeira,
    }
  }, [avaliacoes])

  const substituir = (atualizada: AvaliacaoAluna) =>
    setAvaliacoes((lista) => lista.map((item) => (item.id === atualizada.id ? atualizada : item)))

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!avaliacoes.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Award className="h-10 w-10 text-primary/50" />
          <div>
            <p className="font-semibold">Suas autoavaliações aparecerão aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nas aulas de Defesa Pessoal você avalia a própria evolução e a professora registra a
              nota no sistema. Assim que a primeira for registrada, você acompanha tudo por aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-5" aria-labelledby="titulo-avaliacoes">
      <Card variant="plano" className="relative overflow-hidden border-0 bg-menu text-white shadow-lg">
        <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-[hsl(var(--rosa))]/35 blur-2xl" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-[hsl(var(--laranja))]/30 blur-2xl" />
        <CardContent className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-white/75">
              <Sparkles className="h-4 w-4 text-[hsl(var(--laranja))]" /> Minha jornada
            </div>
            <h2 id="titulo-avaliacoes" className="text-2xl font-bold">Minha evolução</h2>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              A nota é sua: você se avalia na aula e a professora registra. Use-a como ponto de
              apoio para reconhecer conquistas e escolher o próximo passo.
            </p>
          </div>
          <div className="flex items-center justify-center rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <CirculoNota nota={resumo.media} rotulo="Minha média" cor="hsl(var(--rosa))" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 text-primary" /> Autoavaliações registradas
          </div>
          <p className="mt-2 text-2xl font-bold">{avaliacoes.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircleHeart className="h-4 w-4 text-[hsl(var(--rosa))]" /> Reflexões escritas
          </div>
          <p className="mt-2 text-2xl font-bold">
            {resumo.reflexoes}<span className="text-sm font-normal text-muted-foreground">/{avaliacoes.length}</span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-laranja-texto" /> Evolução desde o início
          </div>
          <p className="mt-2 text-2xl font-bold">
            {resumo.evolucao == null
              ? '—'
              : `${resumo.evolucao >= 0 ? '+' : ''}${formatarNota(resumo.evolucao)}`}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {avaliacoes.map((avaliacao, indice) => (
          <Card key={avaliacao.id} className="border-primary/10 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex items-start gap-3 md:w-44 md:shrink-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {avaliacoes.length - indice}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Autoavaliação
                    </p>
                    <p className="font-semibold capitalize">{formatarData(avaliacao.data_avaliacao)}</p>
                    {avaliacao.reflexao_aluna?.trim() ? (
                      <Badge variant="secondary" className="mt-2 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Reflexão escrita
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-2 border-[hsl(var(--laranja))]/40 text-laranja-texto">
                        Sua vez
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="rounded-xl bg-[hsl(var(--fundo-rosa))] p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Minha nota nesta aula</span>
                      <span className="text-xl font-bold text-[hsl(var(--rosa))]">
                        {formatarNota(avaliacao.nota_autoavaliacao)}<span className="text-xs font-normal">/10</span>
                      </span>
                    </div>
                    <Progress
                      value={avaliacao.nota_autoavaliacao * 10}
                      className="h-2"
                      indicatorClassName="bg-[hsl(var(--rosa))]"
                    />
                  </div>

                  {avaliacao.feedback_professora && (
                    <div className="rounded-xl border-l-4 border-laranja bg-[hsl(var(--fundo-pessego))]/60 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-laranja-texto">
                        Feedback da professora
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{avaliacao.feedback_professora}</p>
                    </div>
                  )}

                  <ReflexaoForm avaliacao={avaliacao} aoSalvar={substituir} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
