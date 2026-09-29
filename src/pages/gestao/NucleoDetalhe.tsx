import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  desvincularZonaDoNucleo,
  getAlunasNucleo,
  getEquipeNucleo,
  getNucleo,
  getZonasPrioritarias,
  vincularZonaAoNucleo,
  type AlunaNucleo,
  type MembroNucleo,
  type Nucleo,
  type ZonaPrioritaria,
} from '@/services/nucleos'
import { getProjetos, type Projeto } from '@/services/projetos'
import { vincularProfissionaisAoNucleo } from '@/services/nucleos'
import {
  alocarAluna,
  alocarAlunasEmLote,
  criarTurma,
  desalocarAluna,
  desvincularProfissional,
  editarTurma,
  excluirTurma,
  getTurmas,
  type Turma,
} from '@/services/turmas'
import api from '@/lib/api/client'
import type { Usuario } from '@/lib/types'
import { getErrorMessage } from '@/lib/api/errors'
import {
  chamadasPermitidas,
  diasSemana,
  formatarDias,
  tipoChamadaLabel,
  tipoProfissionalLabel,
  tiposProfissionais,
  turnoLabel,
  turnos,
} from '@/lib/turmas'
import { MultiSelect } from '@/components/ui/multi-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { useApp } from '@/store/app-context'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

const turmaVazia = {
  nome: '',
  capacidade: '',
  dias_semana: '',
  turno: '',
  horario_inicio: '',
  horario_fim: '',
}
const SEM_TURMA = '__sem_turma__'

/** Deixa explícito, na hora de escolher o tipo, qual chamada aquela função abre. */
const descricaoChamadas = (tipoProfissional: string) => {
  const chamadas = chamadasPermitidas(tipoProfissional)
  if (!chamadas.length) return 'sem chamada'
  return `chamada de ${chamadas.map((c) => tipoChamadaLabel(c).replace(/^\S+\s/, '')).join(' e ')}`
}

export default function NucleoDetalhe() {
  const { id = '' } = useParams()
  const { user } = useApp()
  // Abrir turma é exclusivo da Gestão Geral; o Administrativo gerencia equipe e alunas.
  const podeAbrirTurma = user?.perfil === 'GESTAO_GERAL'
  const podeGerenciarZonas =
    user?.perfil === 'GESTAO_GERAL' || user?.perfil === 'ADMINISTRATIVO'
  const [nucleo, setNucleo] = useState<Nucleo | null>(null)
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [equipe, setEquipe] = useState<MembroNucleo[]>([])
  const [alunas, setAlunas] = useState<AlunaNucleo[]>([])
  const [profissionais, setProfissionais] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  // As zonas são cadastros globais; aqui o núcleo apenas vincula as que utiliza.
  const [todasZonas, setTodasZonas] = useState<ZonaPrioritaria[]>([])
  const [zonaParaVincular, setZonaParaVincular] = useState('')

  // Formulário de turma: `turmaEditando` diferencia abrir uma turma de editar a existente.
  const [novaTurma, setNovaTurma] = useState<typeof turmaVazia | null>(null)
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null)
  // Exclusão de turma: pede a senha da Gestão, como a exclusão de núcleo.
  const [turmaExcluir, setTurmaExcluir] = useState<Turma | null>(null)
  const [senhaExclusao, setSenhaExclusao] = useState('')
  // Alocação de alunas a partir da turma, com seleção múltipla.
  const [alocacao, setAlocacao] = useState<{ turma: Turma; alunas_ids: string[] } | null>(null)
  // Vínculo da equipe: vários profissionais entram de uma vez na mesma turma e com o mesmo papel.
  const [novoVinculo, setNovoVinculo] = useState<{
    turma_id: string
    profissionais_ids: string[]
    tipo_profissional: string
  } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [n, ts, eq, al, ps, projs, zonas] = await Promise.all([
      getNucleo(id),
      getTurmas(id),
      getEquipeNucleo(id),
      getAlunasNucleo(id),
      api.get<Usuario[]>('/api/users?perfil=PROFESSOR,ASSISTENTE_SOCIAL'),
      getProjetos(),
      getZonasPrioritarias(),
    ])
    setNucleo(n)
    setTurmas(ts)
    setEquipe(eq)
    setAlunas(al)
    setProfissionais(ps)
    setProjeto(projs.find((p) => p.id === n.projeto_id) ?? null)
    setTodasZonas(zonas)
  }, [id])

  useEffect(() => {
    setCarregando(true)
    load()
      .catch((e) =>
        toast({
          title: 'Erro ao carregar o núcleo',
          description: getErrorMessage(e),
          variant: 'destructive',
        }),
      )
      .finally(() => setCarregando(false))
  }, [load])

  const turmasPorId = useMemo(
    () => Object.fromEntries(turmas.map((t) => [t.id, t])),
    [turmas],
  )
  /**
   * Turmas do núcleo que dividem turno e pelo menos um dia. Não é bloqueio — o núcleo pode ter
   * salas ou equipes em paralelo —, é um aviso para a gestão conferir se o espaço comporta.
   */
  const conflitos = useMemo(() => {
    const mapa: Record<string, string[]> = {}
    turmas.forEach((t) => {
      const dias = (t.dias_semana ?? '').split(',').filter(Boolean)
      mapa[t.id] = turmas
        .filter(
          (outra) =>
            outra.id !== t.id &&
            outra.turno === t.turno &&
            (outra.dias_semana ?? '').split(',').some((d) => d && dias.includes(d)),
        )
        .map((outra) => outra.nome)
    })
    return mapa
  }, [turmas])
  const equipePorTurma = useMemo(() => {
    const mapa: Record<string, MembroNucleo[]> = {}
    equipe.forEach((m) => (mapa[m.turma_id] = [...(mapa[m.turma_id] ?? []), m]))
    return mapa
  }, [equipe])
  const alunasPorTurma = useMemo(() => {
    const mapa: Record<string, AlunaNucleo[]> = {}
    alunas.forEach((a) => {
      if (a.turma_id) mapa[a.turma_id] = [...(mapa[a.turma_id] ?? []), a]
    })
    return mapa
  }, [alunas])
  const semTurma = alunas.filter((a) => !a.turma_id).length
  const zonasPrioritarias = nucleo?.zonas_prioritarias ?? []

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setSalvando(true)
    try {
      await acao()
      toast({ title: sucesso })
      await load()
      return true
    } catch (e) {
      toast({ title: 'Não foi possível concluir', description: getErrorMessage(e), variant: 'destructive' })
      return false
    } finally {
      setSalvando(false)
    }
  }

  const alternarDia = (dia: string, marcado: boolean) =>
    setNovaTurma((f) => {
      if (!f) return f
      const atuais = f.dias_semana ? f.dias_semana.split(',') : []
      const novos = marcado ? [...new Set([...atuais, dia])] : atuais.filter((d) => d !== dia)
      return { ...f, dias_semana: novos.join(',') }
    })

  const zonasDisponiveis = todasZonas.filter(
    (zona) => !zonasPrioritarias.some((vinculada) => vinculada.id === zona.id),
  )

  const vincularZona = async () => {
    if (!zonaParaVincular) return
    const ok = await executar(
      () => vincularZonaAoNucleo(zonaParaVincular, id),
      '🗺️ Zona vinculada ao núcleo!',
    )
    if (ok) setZonaParaVincular('')
  }

  /**
   * Aloca as alunas selecionadas na turma. A resposta separa quem entrou de quem já estava e de
   * quem foi recusada, então o aviso conta o que realmente aconteceu.
   */
  const salvarAlocacao = async () => {
    if (!alocacao || !alocacao.alunas_ids.length) return
    setSalvando(true)
    try {
      const resultado = await alocarAlunasEmLote(alocacao.turma.id, alocacao.alunas_ids)
      const partes: string[] = []
      if (resultado.ja_na_turma.length)
        partes.push(`${resultado.ja_na_turma.length} já estava(m) na turma`)
      resultado.recusadas.forEach((r) => partes.push(r.motivo))
      toast({
        title: `🙋‍♀️ ${resultado.alocadas.length} aluna(s) alocada(s) em ${alocacao.turma.nome}.`,
        description: partes.length ? partes.join(' · ') : undefined,
        variant: resultado.alocadas.length ? undefined : 'destructive',
      })
      await load()
      setAlocacao(null)
    } catch (e) {
      toast({
        title: 'Não foi possível alocar',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusaoTurma = async () => {
    if (!turmaExcluir || !senhaExclusao) return
    const ok = await executar(
      () => excluirTurma(turmaExcluir.id, senhaExclusao),
      `Turma ${turmaExcluir.nome} excluída.`,
    )
    if (ok) {
      setTurmaExcluir(null)
      setSenhaExclusao('')
    }
  }

  const abrirNovaTurma = () => {
    setTurmaEditando(null)
    setNovaTurma({ ...turmaVazia })
  }

  const abrirEdicaoTurma = (t: Turma) => {
    setTurmaEditando(t)
    setNovaTurma({
      nome: t.nome,
      dias_semana: t.dias_semana ?? '',
      turno: t.turno ?? '',
      horario_inicio: t.horario_inicio ?? '',
      horario_fim: t.horario_fim ?? '',
      capacidade: t.capacidade == null ? '' : String(t.capacidade),
    })
  }

  const salvarTurma = async () => {
    if (!novaTurma) return
    const dados = {
      ...novaTurma,
      nucleo_id: id,
      capacidade: Number(novaTurma.capacidade) || undefined,
    }
    const ok = await executar(
      () =>
        turmaEditando
          ? editarTurma(turmaEditando.id, { ...dados, ativo: turmaEditando.ativo })
          : criarTurma(dados),
      turmaEditando ? '🎓 Turma atualizada!' : '🎓 Turma aberta!',
    )
    if (ok) {
      setNovaTurma(null)
      setTurmaEditando(null)
    }
  }

  /**
   * Vincula em lote. A resposta separa quem entrou de quem já estava e de quem foi recusado por
   * choque de horário, então o aviso conta exatamente o que aconteceu em vez de só "salvo".
   */
  const salvarVinculo = async () => {
    if (!novoVinculo || !novoVinculo.profissionais_ids.length) return
    setSalvando(true)
    try {
      const resultado = await vincularProfissionaisAoNucleo(
        id,
        novoVinculo.profissionais_ids,
        novoVinculo.turma_id,
        novoVinculo.tipo_profissional,
      )
      const partes: string[] = []
      if (resultado.ja_vinculados.length)
        partes.push(`${resultado.ja_vinculados.length} já estava(m) na turma`)
      resultado.recusados.forEach((r) => partes.push(r.motivo))
      toast({
        title: `👥 ${resultado.adicionados.length} profissional(is) vinculado(s).`,
        description: partes.length ? partes.join(' · ') : undefined,
        variant: resultado.adicionados.length ? undefined : 'destructive',
      })
      await load()
      setNovoVinculo(null)
    } catch (e) {
      toast({
        title: 'Não foi possível vincular',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )

  if (!nucleo)
    return (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="text-muted-foreground">Núcleo não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/gestao/nucleos">Voltar para os núcleos</Link>
        </Button>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/gestao/nucleos">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Núcleos
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            📁 {projeto?.nome ?? 'Projeto não associado'}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Building2 className="h-7 w-7" />
            {nucleo.nome}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {[nucleo.endereco, nucleo.bairro, nucleo.cidade, nucleo.estado]
                .filter(Boolean)
                .join(', ') || 'Endereço não informado'}
            </span>
            <span>👤 {nucleo.responsavel || 'Responsável não informado'}</span>
            <span>Capacidade: {nucleo.capacidade ?? 'não informada'}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="turmas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="turmas">🎓 Turmas ({turmas.length})</TabsTrigger>
          <TabsTrigger value="equipe">👥 Equipe ({equipe.length})</TabsTrigger>
          <TabsTrigger value="alunas">🙋‍♀️ Alunas ({alunas.length})</TabsTrigger>
          <TabsTrigger value="zonas">🗺️ Zonas ({zonasPrioritarias.length})</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ turmas */}
        <TabsContent value="turmas" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              A turma define o período e os dias da aula. As chamadas acontecem por turma.
            </p>
            {podeAbrirTurma && (
              <Button onClick={abrirNovaTurma}>
                <Plus className="mr-2 h-4 w-4" />
                Abrir turma
              </Button>
            )}
          </div>
          {turmas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Nenhuma turma aberta neste núcleo.</p>
                <p className="text-sm text-muted-foreground">
                  Abra a primeira turma para vincular a equipe e alocar as alunas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {turmas.map((t) => (
                <Card key={t.id} className={conflitos[t.id]?.length ? 'border-amber-300' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      {t.nome}
                      <Badge variant="secondary">{turnoLabel(t.turno)}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      📅 {formatarDias(t.dias_semana) || 'Sem dias definidos'}
                    </p>
                    {conflitos[t.id]?.length > 0 && (
                      <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Mesmo período e dia de {conflitos[t.id].join(', ')}. Confirme que o núcleo
                          comporta as turmas ao mesmo tempo.
                        </span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      <span>👥 {(equipePorTurma[t.id] ?? []).length} na equipe</span>
                      <span>
                        🙋‍♀️ {(alunasPorTurma[t.id] ?? []).length} aluna(s)
                        {t.capacidade ? ` de ${t.capacidade}` : ''}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAlocacao({ turma: t, alunas_ids: [] })}
                      >
                        <Users className="mr-1.5 h-4 w-4" />
                        Alocar alunas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNovoVinculo({
                            turma_id: t.id,
                            profissionais_ids: [],
                            tipo_profissional: '',
                          })
                        }
                      >
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        Vincular profissionais
                      </Button>
                      {podeAbrirTurma && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => abrirEdicaoTurma(t)}>
                            <Pencil className="mr-1.5 h-4 w-4" />
                            Editar turma
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setTurmaExcluir(t)}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Apagar turma
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------ equipe */}
        <TabsContent value="equipe" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              O tipo escolhido no vínculo define as permissões da pessoa dentro daquela turma.
            </p>
            <Button
              disabled={!turmas.length}
              onClick={() =>
                setNovoVinculo({
                  turma_id: turmas[0]?.id ?? '',
                  profissionais_ids: [],
                  tipo_profissional: '',
                })
              }
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Vincular profissionais à turma
            </Button>
          </div>
          {!turmas.length && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              ⚠️ Abra uma turma antes de montar a equipe.
            </div>
          )}
          {equipe.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Nenhum profissional vinculado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {equipe.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3"
                >
                  <div>
                    <p className="font-medium">{m.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {tipoProfissionalLabel(m.tipo_profissional)} · {m.turma_nome} ·{' '}
                      {turnoLabel(m.turma_turno)} · {formatarDias(m.turma_dias)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {descricaoChamadas(m.tipo_profissional)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={salvando}
                    onClick={() =>
                      executar(
                        () => desvincularProfissional(m.turma_id, m.user_id),
                        'Vínculo removido.',
                      )
                    }
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------ alunas */}
        <TabsContent value="alunas" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Alunas aprovadas neste núcleo. Cada aluna fica em uma turma por vez — a chamada usa essa
            alocação.
            {semTurma > 0 && (
              <strong className="ml-1 text-amber-700">
                {semTurma} sem turma.
              </strong>
            )}
          </p>
          {alunas.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma aluna aprovada neste núcleo ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alunas.map((a) => (
                <div
                  key={a.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3"
                >
                  <div>
                    <p className="font-medium">{a.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.turma_id
                        ? `${a.turma_nome ?? turmasPorId[a.turma_id]?.nome ?? 'Turma'} · ${turnoLabel(
                            turmasPorId[a.turma_id]?.turno,
                          )}`
                        : 'Sem turma'}
                      {a.periodo_preferido &&
                        ` · pediu ${turnoLabel(a.periodo_preferido).toLowerCase()}`}
                    </p>
                    {/* Alocada num período diferente do que pediu — vale a gestão conferir. */}
                    {a.turma_id &&
                      a.periodo_preferido &&
                      turmasPorId[a.turma_id]?.turno !== a.periodo_preferido && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Período diferente do pedido na inscrição.
                        </p>
                      )}
                  </div>
                  <Select
                    value={a.turma_id ?? SEM_TURMA}
                    disabled={salvando || !turmas.length}
                    onValueChange={(v) => {
                      if (v === SEM_TURMA) {
                        if (!a.turma_id) return
                        executar(
                          () => desalocarAluna(a.turma_id as string, a.user_id),
                          'Aluna removida da turma.',
                        )
                        return
                      }
                      executar(() => alocarAluna(v, a.user_id), 'Aluna alocada na turma!')
                    }}
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Selecionar turma..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_TURMA}>Sem turma</SelectItem>
                      {turmas.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome} · {turnoLabel(t.turno)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------ zonas prioritárias */}
        <TabsContent value="zonas" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Zonas prioritárias do núcleo</p>
              <p className="text-sm text-muted-foreground">
                Selecione entre as zonas globais já cadastradas. A mesma zona pode ser usada em
                vários núcleos.
              </p>
            </div>
          </div>

          {podeGerenciarZonas && (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label>Vincular uma zona existente</Label>
                  <Select value={zonaParaVincular} onValueChange={setZonaParaVincular}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a zona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {zonasDisponiveis.map((zona) => (
                        <SelectItem key={zona.id} value={zona.id}>
                          {zona.nome} · {zona.cidade}/{zona.estado} · {zona.bairros.length} bairros
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={!zonaParaVincular || salvando} onClick={vincularZona}>
                  <Plus className="mr-2 h-4 w-4" /> Vincular zona
                </Button>
                {!todasZonas.length && (
                  <p className="text-sm text-muted-foreground">
                    Cadastre primeiro uma zona na tela de Núcleos.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {zonasPrioritarias.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Nenhuma zona prioritária cadastrada.</p>
                <p className="text-sm text-muted-foreground">
                  Vincule uma zona global para aplicar seus bairros neste núcleo.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {zonasPrioritarias.map((zona) => (
                <Card key={zona.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3 text-base">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> {zona.nome}
                      </span>
                      <Badge variant="secondary">{zona.bairros.length} bairro(s)</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {zona.cidade}/{zona.estado}
                      {zona.ponto_entrada || zona.ponto_saida
                        ? ` · ${zona.ponto_entrada || 'início não informado'} → ${zona.ponto_saida || 'fim não informado'}`
                        : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {zona.bairros.map((bairro) => (
                        <Badge key={bairro} variant="outline">
                          {bairro}
                        </Badge>
                      ))}
                    </div>
                    {zona.atualizado_por_nome && (
                      <p className="text-xs text-muted-foreground">
                        Última alteração por {zona.atualizado_por_nome}.
                      </p>
                    )}
                    {podeGerenciarZonas && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={salvando}
                        onClick={() =>
                          executar(
                            () => desvincularZonaDoNucleo(zona.id, id),
                            `Zona ${zona.nome} desvinculada do núcleo.`,
                          )
                        }
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" /> Desvincular
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------- dialog turma */}
      <Dialog
        open={!!novaTurma}
        onOpenChange={(o) => {
          if (!o) {
            setNovaTurma(null)
            setTurmaEditando(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {turmaEditando ? `🎓 Editar ${turmaEditando.nome}` : `🎓 Abrir turma em ${nucleo.nome}`}
            </DialogTitle>
          </DialogHeader>
          {novaTurma && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da turma *</Label>
                <Input
                  value={novaTurma.nome}
                  onChange={(e) => setNovaTurma({ ...novaTurma, nome: e.target.value })}
                  placeholder="Ex.: Turma manhã"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  min="1"
                  max={nucleo.capacidade ?? undefined}
                  value={novaTurma.capacidade}
                  onChange={(e) => setNovaTurma({ ...novaTurma, capacidade: e.target.value })}
                />
                {nucleo.capacidade != null && (
                  <p
                    className={
                      Number(novaTurma.capacidade) > nucleo.capacidade
                        ? 'text-xs font-medium text-destructive'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    Máximo {nucleo.capacidade} — a turma não pode comportar mais gente que o núcleo.
                  </p>
                )}
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                <Label>📅 Dias da semana *</Label>
                <div className="flex flex-wrap gap-4">
                  {diasSemana.map(([valor, label]) => (
                    <label key={valor} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={novaTurma.dias_semana.split(',').includes(valor)}
                        onCheckedChange={(v) => alternarDia(valor, v === true)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>🕐 Período da aula *</Label>
                <Select
                  value={novaTurma.turno}
                  onValueChange={(v) => setNovaTurma({ ...novaTurma, turno: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período..." />
                  </SelectTrigger>
                  <SelectContent>
                    {turnos.map(([valor, label]) => (
                      <SelectItem key={valor} value={valor}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>🕐 Horário de início *</Label>
                  <Input
                    type="time"
                    value={novaTurma.horario_inicio}
                    onChange={(e) =>
                      setNovaTurma({ ...novaTurma, horario_inicio: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>🕐 Horário de término *</Label>
                  <Input
                    type="time"
                    value={novaTurma.horario_fim}
                    onChange={(e) => setNovaTurma({ ...novaTurma, horario_fim: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                É este horário que a candidata vê e escolhe no formulário de inscrição.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNovaTurma(null)
                setTurmaEditando(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarTurma}
              disabled={
                salvando || !novaTurma?.nome || !novaTurma?.dias_semana || !novaTurma?.turno
              }
            >
              {salvando
                ? 'Salvando...'
                : turmaEditando
                  ? '💾 Salvar alterações'
                  : 'Abrir turma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------ dialog equipe */}
      <Dialog open={!!novoVinculo} onOpenChange={(o) => !o && setNovoVinculo(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>👥 Vincular profissionais a uma turma</DialogTitle>
          </DialogHeader>
          {novoVinculo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>🎓 Turma *</Label>
                <Select
                  value={novoVinculo.turma_id}
                  onValueChange={(v) => setNovoVinculo({ ...novoVinculo, turma_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome} · {turnoLabel(t.turno)} · {formatarDias(t.dias_semana)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>👤 Profissionais *</Label>
                <MultiSelect
                  options={profissionais.map((p) => ({
                    value: p.id,
                    label: p.nomeSocial?.trim() || p.name,
                    hint: p.email,
                  }))}
                  value={novoVinculo.profissionais_ids}
                  onChange={(v) => setNovoVinculo({ ...novoVinculo, profissionais_ids: v })}
                  placeholder="Selecione as pessoas..."
                  searchPlaceholder="Buscar por nome ou e-mail..."
                  emptyMessage="Nenhum profissional cadastrado."
                />
                <p className="text-xs text-muted-foreground">
                  Todos os selecionados entram nesta turma com a mesma função. Quem já estiver na
                  equipe é ignorado, sem erro.
                </p>
              </div>
              <div className="space-y-2">
                <Label>🏷️ Tipo de profissional na turma *</Label>
                <Select
                  value={novoVinculo.tipo_profissional}
                  onValueChange={(v) => setNovoVinculo({ ...novoVinculo, tipo_profissional: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposProfissionais.map(([valor, label]) => (
                      <SelectItem key={valor} value={valor}>
                        {label} — {descricaoChamadas(valor)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cada profissional acessa só a chamada da própria função. A mesma pessoa pode atuar
                  em várias turmas, núcleos e projetos — desde que não no mesmo dia e período.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoVinculo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarVinculo}
              disabled={
                salvando ||
                !novoVinculo?.turma_id ||
                !novoVinculo?.profissionais_ids.length ||
                !novoVinculo?.tipo_profissional
              }
            >
              {salvando
                ? 'Vinculando...'
                : `Vincular ${novoVinculo?.profissionais_ids.length ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------- dialog alocar alunas */}
      <Dialog open={!!alocacao} onOpenChange={(o) => !o && setAlocacao(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>🙋‍♀️ Alocar alunas em {alocacao?.turma.nome}</DialogTitle>
          </DialogHeader>
          {alocacao && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Alunas aprovadas do núcleo *</Label>
                <MultiSelect
                  options={alunas
                    .filter((a) => a.turma_id !== alocacao.turma.id)
                    .map((a) => ({
                      value: a.user_id,
                      label: a.nome_completo,
                      hint: a.turma_id
                        ? `hoje em ${a.turma_nome ?? turmasPorId[a.turma_id]?.nome ?? 'outra turma'}`
                        : a.periodo_preferido
                          ? `sem turma · pediu ${turnoLabel(a.periodo_preferido).toLowerCase()}`
                          : 'sem turma',
                    }))}
                  value={alocacao.alunas_ids}
                  onChange={(v) => setAlocacao({ ...alocacao, alunas_ids: v })}
                  placeholder="Selecione as alunas..."
                  searchPlaceholder="Buscar pelo nome..."
                  emptyMessage="Nenhuma aluna disponível para esta turma."
                />
                <p className="text-xs text-muted-foreground">
                  Cada aluna fica em uma turma por vez: quem já está em outra turma do núcleo é
                  transferida para esta.
                  {alocacao.turma.capacidade
                    ? ` A turma comporta ${alocacao.turma.capacidade} alunas — hoje tem ${
                        (alunasPorTurma[alocacao.turma.id] ?? []).length
                      }.`
                    : ''}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlocacao(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarAlocacao}
              disabled={salvando || !alocacao?.alunas_ids.length}
            >
              {salvando ? 'Alocando...' : `Alocar ${alocacao?.alunas_ids.length ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------- dialog apagar turma */}
      <Dialog
        open={!!turmaExcluir}
        onOpenChange={(o) => {
          if (!o) {
            setTurmaExcluir(null)
            setSenhaExclusao('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Apagar turma
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold">
                Tem certeza que deseja apagar &ldquo;{turmaExcluir?.nome}&rdquo;?
              </p>
              <p className="mt-1 text-muted-foreground">
                A ação é permanente. Turmas com aluna alocada, chamada ou registro de aula são
                protegidas pelo sistema — nesses casos, desative a turma na edição em vez de apagar.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Senha da Gestão Geral *</Label>
              <Input
                type="password"
                autoFocus
                value={senhaExclusao}
                onChange={(e) => setSenhaExclusao(e.target.value)}
                placeholder="Digite sua senha para confirmar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && senhaExclusao) confirmarExclusaoTurma()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTurmaExcluir(null)
                setSenhaExclusao('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={salvando || !senhaExclusao}
              onClick={confirmarExclusaoTurma}
            >
              {salvando ? 'Apagando...' : 'Apagar permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
