import { useEffect, useState } from 'react'
import { getMinhasTurmas, getAlunasTurma, type MinhaTurma, type AlunaTurma } from '@/services/turmas'
import { authStore } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import {
  formatarDias,
  semChamadaMotivo,
  tipoChamadaLabel,
  tipoProfissionalLabel,
  tiposChamada,
  turnoLabel,
  type TipoChamada,
} from '@/lib/turmas'
import ChamadaTurma from '@/components/turmas/ChamadaTurma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

/** Lista somente-leitura usada por quem não pode registrar chamada (Monitor de Criança). */
function AlunasDaTurma({ turmaId }: { turmaId: string }) {
  const [alunas, setAlunas] = useState<AlunaTurma[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    getAlunasTurma(turmaId)
      .then((lista) => ativo && setAlunas(lista))
      .catch((e) =>
        toast({
          title: 'Erro ao carregar alunas',
          description: getErrorMessage(e),
          variant: 'destructive',
        }),
      )
      .finally(() => ativo && setLoading(false))
    return () => {
      ativo = false
    }
  }, [turmaId])

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  if (!alunas.length)
    return <p className="text-sm text-muted-foreground">Nenhuma aluna alocada nesta turma.</p>
  return (
    <ul className="space-y-1.5 text-sm">
      {alunas.map((a) => (
        <li key={a.user_id} className="rounded-md border bg-background px-3 py-2">
          {a.nome_completo}
        </li>
      ))}
    </ul>
  )
}

export function PainelTurma({ vinculo }: { vinculo: MinhaTurma }) {
  // Cada profissional vê apenas a chamada da própria função.
  const permitidas = (vinculo.chamadas_permitidas ?? []) as TipoChamada[]
  const [tipo, setTipo] = useState<TipoChamada>(permitidas[0] ?? 'DEFESA_PESSOAL')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vinculo.turma.nome}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
          <Badge variant="secondary">{tipoProfissionalLabel(vinculo.tipo_profissional)}</Badge>
          <span>🏠 {vinculo.nucleo_nome}</span>
          {vinculo.projeto_nome && <span>· 📁 {vinculo.projeto_nome}</span>}
          <span>· {turnoLabel(vinculo.turma.turno)}</span>
          <span>· 📅 {formatarDias(vinculo.turma.dias_semana) || 'sem dias definidos'}</span>
        </div>
      </CardHeader>
      <CardContent>
        {permitidas.length > 0 ? (
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as TipoChamada)}>
            <TabsList>
              {tiposChamada
                .filter(([valor]) => permitidas.includes(valor as TipoChamada))
                .map(([valor, label]) => (
                  <TabsTrigger key={valor} value={valor}>
                    {label}
                  </TabsTrigger>
                ))}
            </TabsList>
            {permitidas.map((valor) => (
              <TabsContent key={valor} value={valor} className="mt-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Chamada de {tipoChamadaLabel(valor).replace(/^\S+\s/, '')} — independente da outra
                  chamada do mesmo dia. Cada chamada vale <strong>0,5 aula</strong>; as duas juntas
                  completam 1 aula.
                </p>
                <ChamadaTurma turmaId={vinculo.turma.id} tipoChamada={valor} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {semChamadaMotivo[vinculo.tipo_profissional] ??
                'Sua função nesta turma não registra chamada.'}{' '}
              Abaixo estão as alunas da turma.
            </p>
            <AlunasDaTurma turmaId={vinculo.turma.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Abas com as turmas em que a pessoa logada atua. Cada aba traz a chamada da turma, separada em
 * Defesa Pessoal e Roda de Conversa. Uma mesma pessoa pode atuar em várias turmas, núcleos e
 * projetos — o papel (e as permissões) valem por turma.
 */
export function useMinhasTurmas() {
  const [turmas, setTurmas] = useState<MinhaTurma[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    if (!authStore.token) {
      setTurmas([])
      setLoading(false)
      return
    }
    getMinhasTurmas()
      .then((lista) => ativo && setTurmas(lista))
      .catch(() => ativo && setTurmas([]))
      .finally(() => ativo && setLoading(false))
    return () => {
      ativo = false
    }
  }, [])

  return { turmas, loading }
}

export default function MinhasTurmas() {
  const { turmas, loading } = useMinhasTurmas()
  const [ativa, setAtiva] = useState('')

  useEffect(() => {
    if (turmas.length && !ativa) setAtiva(turmas[0].turma.id)
  }, [turmas, ativa])

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )

  if (!turmas.length)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Você ainda não está vinculado a nenhuma turma.</p>
          <p className="text-sm text-muted-foreground">
            A Gestão Geral vincula profissionais às turmas na aba Equipe do núcleo.
          </p>
        </CardContent>
      </Card>
    )

  return (
    <Tabs value={ativa} onValueChange={setAtiva} className="space-y-4">
      <TabsList className="flex h-auto flex-wrap justify-start">
        {turmas.map((v) => (
          <TabsTrigger key={v.turma.id} value={v.turma.id}>
            {v.turma.nome}
            <span className="ml-1.5 text-xs opacity-70">· {v.nucleo_nome}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {turmas.map((v) => (
        <TabsContent key={v.turma.id} value={v.turma.id}>
          <PainelTurma vinculo={v} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
