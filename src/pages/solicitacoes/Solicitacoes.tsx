import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/store/app-context'
import {
  getSolicitacoes,
  solicitarCriacaoAluna,
  aprovarSolicitacao,
  recusarSolicitacao,
  type Solicitacao,
} from '@/services/solicitacoes'
import { getInscricoesPaginated, updateStatus } from '@/services/ficha-inscricao'
import {
  getNucleos,
  getNucleosResumo,
  type Nucleo,
  type NucleoResumo,
} from '@/services/nucleos'
import { FichaInscricaoFF } from '@/lib/types'
import { turmaLabels } from '@/lib/constants'
import { campoLabels, documentoLabels, projetoLabel } from '@/lib/equipe-form'
import { getErrorMessage } from '@/lib/api/errors'
import { fileUrl } from '@/lib/api/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import {
  CheckCircle2,
  FileText,
  GraduationCap,
  Inbox,
  Loader2,
  Search,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { InscricaoDetailDialog } from '@/components/admin/InscricaoDetailDialog'

const TIPO_PROFESSOR = 'CADASTRO_PROFESSOR'
const TIPO_ALUNA = 'CRIACAO_ALUNA'
const NUCLEO_GERAL = '__GERAL__'

const normalizarBairro = (valor?: string | null) =>
  (valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')

const zonaDoBairro = (inscricao: FichaInscricaoFF, nucleo?: Nucleo) => {
  const bairro = normalizarBairro(inscricao.bairro)
  if (!bairro) return undefined
  return (nucleo?.zonas_prioritarias ?? []).find((zona) =>
    zona.bairros.some((prioritario) => normalizarBairro(prioritario) === bairro),
  )
}

const statusBadge: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  APROVADA: { label: 'Aprovada', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  RECUSADA: { label: 'Recusada', color: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
}

const tipoLabel: Record<string, string> = {
  CRIACAO_ALUNA: 'Criação de conta de aluna',
  CADASTRO_PROFESSOR: 'Cadastro de equipe',
}

// Ordem e agrupamento dos campos no detalhe do professor.
const camposDetalhe: string[] = [
  'nome_completo',
  'email',
  'telefone',
  'cpf',
  'rg',
  'data_nascimento',
  'nacionalidade',
  'estado_civil',
  'profissao',
  'nome_empresa',
  'cnpj',
  'endereco_residencial',
  'endereco_comercial',
  'tamanho_camisa',
  'dados_bancarios',
  'vinculo_contratual',
  'vinculo_contratual_outro',
  'projeto_contratante',
  'servico_prestado',
]

interface DadosProfessor {
  documentos?: Record<string, string>
  [key: string]: unknown
}

function parseDados(json: string): DadosProfessor {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export default function Solicitacoes() {
  const { user } = useApp()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [inscricoesPendentes, setInscricoesPendentes] = useState<FichaInscricaoFF[]>([])
  const [nucleos, setNucleos] = useState<Nucleo[]>([])
  const [resumosNucleos, setResumosNucleos] = useState<NucleoResumo[]>([])
  const [nucleoSelecionado, setNucleoSelecionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogNova, setDialogNova] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', nucleo: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [analisando, setAnalisando] = useState<string | null>(null)
  // Inscrição aberta para análise: a leitura do perfil vem antes da decisão de aprovar.
  const [inscricaoDetalhe, setInscricaoDetalhe] = useState<FichaInscricaoFF | null>(null)

  // Detalhe/aprovação do cadastro de profissional. Aprovar aqui é só validar o cadastro: o
  // vínculo com o projeto é feito no cadastro do projeto e o vínculo com a turma, na tela do
  // núcleo — é o que permite a mesma pessoa atuar em vários projetos ao mesmo tempo.
  const [profSelecionado, setProfSelecionado] = useState<Solicitacao | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('ALL')
  const [filtroStatus, setFiltroStatus] = useState('ALL')
  const [filtroBairro, setFiltroBairro] = useState('ALL')

  const isGestao = user?.perfil === 'GESTAO_GERAL'
  const isAdministrativo = user?.perfil === 'ADMINISTRATIVO'
  const isAssistente = user?.perfil === 'ASSISTENTE_SOCIAL'
  // A análise e a decisão da inscrição pertencem exclusivamente ao Administrativo.
  const podeAprovarInscricao = user?.perfil === 'ADMINISTRATIVO'

  const load = useCallback(async () => {
    const [solicitacoesResult, inscricoesResult, nucleosResult, resumosResult] =
      await Promise.allSettled([
        getSolicitacoes(),
        getInscricoesPaginated({ status: 'AGUARDANDO', perPage: 200 }),
        getNucleos(),
        getNucleosResumo(),
      ])

    if (solicitacoesResult.status === 'fulfilled') {
      setSolicitacoes(solicitacoesResult.value)
    } else {
      console.error('Failed to load solicitacoes:', solicitacoesResult.reason)
    }

    if (inscricoesResult.status === 'fulfilled') {
      setInscricoesPendentes(inscricoesResult.value.items)
    } else {
      console.error('Failed to load inscricoes:', inscricoesResult.reason)
    }

    if (nucleosResult.status === 'fulfilled') {
      const atuais = nucleosResult.value.filter((n) => n.ativo)
      setNucleos(atuais)
      Object.keys(turmaLabels).forEach((codigo) => delete turmaLabels[codigo])
      atuais.forEach((n) => {
        turmaLabels[n.codigo] = n.nome
      })
    }

    if (resumosResult.status === 'fulfilled') {
      setResumosNucleos(resumosResult.value)
    } else {
      console.error('Failed to load nucleo summaries:', resumosResult.reason)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('solicitacoes', () => {
    load()
  })
  useRealtime('ficha_inscricao_ff', () => {
    load()
  })

  useEffect(() => {
    setFiltroBairro('ALL')
  }, [nucleoSelecionado])

  // Aplicação dos filtros (client-side sobre o que já veio do backend por perfil).
  const mostrarInscricoes =
    (filtroTipo === 'ALL' || filtroTipo === 'INSCRICAO') &&
    (filtroStatus === 'ALL' || filtroStatus === 'PENDENTE')

  const solicitacoesDoNucleo = useMemo(
    () =>
      solicitacoes.filter((s) =>
        nucleoSelecionado === NUCLEO_GERAL
          ? !s.nucleo
          : !!nucleoSelecionado && s.nucleo === nucleoSelecionado,
      ),
    [solicitacoes, nucleoSelecionado],
  )

  const solicitacoesFiltradas = useMemo(
    () =>
      solicitacoesDoNucleo.filter((s) => {
        if (filtroTipo !== 'ALL' && filtroTipo !== 'INSCRICAO' && s.tipo !== filtroTipo)
          return false
        if (filtroTipo === 'INSCRICAO') return false
        if (filtroStatus !== 'ALL' && s.status !== filtroStatus) return false
        return true
      }),
    [solicitacoesDoNucleo, filtroTipo, filtroStatus],
  )

  const nucleoAtual = nucleos.find((n) => n.codigo === nucleoSelecionado)

  const bairrosParaFiltro = useMemo(
    () =>
      [...new Set(
        inscricoesPendentes
          .filter((inscricao) => inscricao.turma === nucleoSelecionado && inscricao.bairro?.trim())
          .map((inscricao) => (inscricao.bairro ?? '').trim()),
      )].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [inscricoesPendentes, nucleoSelecionado],
  )

  const inscricoesFiltradas = useMemo(() => {
    if (!mostrarInscricoes || !nucleoSelecionado || nucleoSelecionado === NUCLEO_GERAL) return []
    return inscricoesPendentes
      .filter(
        (inscricao) =>
          inscricao.turma === nucleoSelecionado &&
          (filtroBairro === 'ALL' ||
            normalizarBairro(inscricao.bairro) === normalizarBairro(filtroBairro)),
      )
      .sort((a, b) => {
        const pontosA = a.pontuacao_prioridade ?? 0
        const pontosB = b.pontuacao_prioridade ?? 0
        if (pontosA !== pontosB) return pontosB - pontosA
        // A avaliação do relato é humana; a data apenas mantém uma ordem estável enquanto o
        // Administrativo decide o desempate.
        return String(b.created ?? '').localeCompare(String(a.created ?? ''))
      })
  }, [
    filtroBairro,
    inscricoesPendentes,
    mostrarInscricoes,
    nucleoAtual,
    nucleoSelecionado,
  ])

  const totalPorNucleo = (codigo: string) =>
    solicitacoes.filter((s) => s.nucleo === codigo).length +
    inscricoesPendentes.filter((i) => i.turma === codigo).length

  const totalGeral = solicitacoes.filter((s) => !s.nucleo).length

  const resumoAtual = resumosNucleos.find((r) => r.nucleo_id === nucleoAtual?.id)
  const nucleoLotado = resumoAtual?.lotado === true

  const handleInscricao = async (id: string, aprovar: boolean) => {
    setAnalisando(id)
    try {
      // Recusada vai para a lista de espera (regra do projeto)
      await updateStatus(id, aprovar ? 'APROVADA' : 'LISTA_ESPERA')
      toast({
        title: aprovar ? 'Inscrição aprovada!' : 'Inscrição movida para a lista de espera.',
        description: aprovar ? 'A aluna já pode preencher a ficha de matrícula.' : undefined,
      })
      load()
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setAnalisando(null)
    }
  }

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!form.nucleo) {
      setErro('Selecione o núcleo da solicitação.')
      return
    }
    setEnviando(true)
    try {
      await solicitarCriacaoAluna(form)
      toast({
        title: 'Solicitação enviada!',
        description: 'A Gestão Geral vai analisar a criação da conta.',
      })
      setForm({ name: '', email: '', password: '', nucleo: '' })
      setDialogNova(false)
      load()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setEnviando(false)
    }
  }

  /** Aprovação/recusa das solicitações de conta. Aprovar cria a conta e nada além disso. */
  const handleAnalise = async (id: string, aprovar: boolean) => {
    setAnalisando(id)
    try {
      if (aprovar) {
        await aprovarSolicitacao(id)
        toast({ title: 'Solicitação aprovada!', description: 'A conta foi criada.' })
      } else {
        await recusarSolicitacao(id)
        toast({ title: 'Solicitação recusada.' })
      }
      setProfSelecionado(null)
      load()
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setAnalisando(null)
    }
  }

  const abrirProfessor = (s: Solicitacao) => setProfSelecionado(s)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const semResultados =
    !!nucleoSelecionado && solicitacoesFiltradas.length === 0 && inscricoesFiltradas.length === 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="w-7 h-7 text-primary" /> Solicitações
          </h1>
          <p className="text-muted-foreground mt-1">
            Tudo que depende de aprovação fica centralizado aqui.
          </p>
        </div>
        {isAssistente && (
          <Button
            className="gap-2 shrink-0"
            onClick={() => {
              setForm((atual) => ({
                ...atual,
                nucleo: nucleoSelecionado === NUCLEO_GERAL ? '' : nucleoSelecionado,
              }))
              setDialogNova(true)
            }}
          >
            <UserPlus className="w-4 h-4" /> Solicitar criação de aluna
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              <SelectItem value="INSCRICAO">Inscrição de aluna</SelectItem>
              <SelectItem value={TIPO_PROFESSOR}>Cadastro de equipe</SelectItem>
              <SelectItem value={TIPO_ALUNA}>Criação de conta de aluna</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="APROVADA">Aprovada</SelectItem>
              <SelectItem value="RECUSADA">Recusada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-nucleo" className="text-xs text-muted-foreground">
            Núcleo
          </Label>
          <Select value={nucleoSelecionado} onValueChange={setNucleoSelecionado}>
            <SelectTrigger id="filtro-nucleo" className="w-full">
              <SelectValue placeholder="Selecione o núcleo" />
            </SelectTrigger>
            <SelectContent>
              {nucleos.map((nucleo) => (
                <SelectItem key={nucleo.id} value={nucleo.codigo}>
                  {nucleo.nome} ({totalPorNucleo(nucleo.codigo)})
                </SelectItem>
              ))}
              <SelectItem value={NUCLEO_GERAL}>Sem núcleo definido ({totalGeral})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-bairro" className="text-xs text-muted-foreground">
            Bairro
          </Label>
          <Select
            value={filtroBairro}
            onValueChange={setFiltroBairro}
            disabled={!nucleoAtual || bairrosParaFiltro.length === 0}
          >
            <SelectTrigger id="filtro-bairro" className="w-full">
              <SelectValue placeholder="Todos os bairros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os bairros</SelectItem>
              {bairrosParaFiltro.map((bairro) => (
                <SelectItem key={bairro} value={bairro}>
                  {bairro}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {nucleoAtual && resumoAtual && (
        <Card className={nucleoLotado ? 'border-rose-300 bg-rose-50/50' : 'border-primary/20'}>
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{nucleoAtual.nome}</p>
                {nucleoLotado && <Badge variant="destructive">Limite preenchido</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                A ocupação considera somente as alunas aprovadas neste núcleo.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <div>
                <p className="text-muted-foreground">Capacidade</p>
                <p className="text-lg font-semibold">{resumoAtual.capacidade ?? 'Não definida'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ocupadas</p>
                <p className="text-lg font-semibold">{resumoAtual.alunas}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vagas disponíveis</p>
                <p
                  className={`text-lg font-semibold ${nucleoLotado ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  {resumoAtual.vagas_disponiveis ?? 'Sem limite'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!nucleoSelecionado && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione um núcleo para visualizar as solicitações e as vagas disponíveis.
          </CardContent>
        </Card>
      )}

      {semResultados ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma solicitação encontrada com esses filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {inscricoesFiltradas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Inscrições aguardando aprovação (
                {inscricoesFiltradas.length})
              </h2>
              {inscricoesFiltradas.map((i) => (
                <Card key={i.id}>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">Inscrição — {i.nome_completo}</span>
                          <Badge className={statusBadge.PENDENTE.color} variant="secondary">
                            Aguardando
                          </Badge>
                          <Badge variant="outline" className="font-semibold">
                            {i.pontuacao_prioridade ?? 0} pontos ·{' '}
                            {i.criterios_prioridade?.length ?? 0}/10 com valor integral
                          </Badge>
                          {zonaDoBairro(i, nucleoAtual) && (
                            <Badge
                              variant="secondary"
                              className="bg-violet-100 text-violet-800 hover:bg-violet-100"
                            >
                              Zona: {zonaDoBairro(i, nucleoAtual)?.nome}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {turmaLabels[i.turma ?? ''] ?? i.turma ?? 'Sem turma'}
                          {i.email ? ` · ${i.email}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Horário escolhido:</strong> {i.horario_preferido || 'Não informado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Bairro:</strong> {i.bairro || 'Não informado'} ·{' '}
                          {zonaDoBairro(i, nucleoAtual)
                            ? `zona ${zonaDoBairro(i, nucleoAtual)?.nome}`
                            : 'fora das zonas prioritárias'}
                        </p>
                        <div className="max-w-2xl rounded-md bg-muted/40 p-3 text-sm">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Relato para desempate
                          </p>
                          <p className="line-clamp-3 whitespace-pre-wrap">
                            {i.motivo_participar || 'Sem relato informado'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Inscrita em{' '}
                          {i.created ? new Date(i.created).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setInscricaoDetalhe(i)}
                        >
                          <Search className="w-4 h-4" /> Analisar
                        </Button>
                        {podeAprovarInscricao && (
                          <>
                          <Button
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={analisando === i.id}
                            onClick={() => {
                              if (nucleoLotado) {
                                toast({
                                  title: 'Limite de vagas preenchido',
                                  description: `O núcleo ${nucleoAtual?.nome ?? ''} não possui vagas disponíveis.`,
                                  variant: 'destructive',
                                })
                                return
                              }
                              handleInscricao(i.id, true)
                            }}
                          >
                            {analisando === i.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            {nucleoLotado ? 'Limite preenchido' : 'Aprovar'}
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-1.5 text-rose-600 hover:text-rose-700"
                            disabled={analisando === i.id}
                            onClick={() => handleInscricao(i.id, false)}
                          >
                            <XCircle className="w-4 h-4" /> Lista de espera
                          </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {solicitacoesFiltradas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Outras solicitações (
                {solicitacoesFiltradas.length})
              </h2>
              {solicitacoesFiltradas.map((s) => {
                const dados = parseDados(s.dados)
                const badge = statusBadge[s.status] ?? statusBadge.PENDENTE
                const ehProfessor = s.tipo === TIPO_PROFESSOR
                return (
                  <Card key={s.id}>
                    <CardContent>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{tipoLabel[s.tipo] ?? s.tipo}</span>
                            <Badge className={badge.color} variant="secondary">
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>{String(dados.nome_completo ?? dados.name ?? '—')}</strong> ·{' '}
                            {String(dados.email ?? '—')}
                          </p>
                          {ehProfessor && (
                            <p className="text-xs text-muted-foreground">
                              {projetoLabel(String(dados.projeto_contratante ?? ''))}
                              {dados.servico_prestado ? ` · ${dados.servico_prestado}` : ''}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {ehProfessor
                              ? `Auto-cadastro em ${new Date(s.created).toLocaleDateString('pt-BR')}`
                              : `Solicitado por ${s.solicitado_por_nome} em ${new Date(
                                  s.created,
                                ).toLocaleDateString('pt-BR')}`}
                          </p>
                          {s.observacao && (
                            <p className="text-xs text-muted-foreground">
                              Observação: {s.observacao}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          {ehProfessor && (
                            <Button
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => abrirProfessor(s)}
                            >
                              <FileText className="w-4 h-4" />
                              {(isGestao || isAdministrativo) && s.status === 'PENDENTE'
                                ? 'Analisar'
                                : 'Ver detalhes'}
                            </Button>
                          )}
                          {isGestao && s.status === 'PENDENTE' && !ehProfessor && (
                            <>
                              <Button
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                disabled={analisando === s.id}
                                onClick={() => handleAnalise(s.id, true)}
                              >
                                {analisando === s.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                className="gap-1.5 text-rose-600 hover:text-rose-700"
                                disabled={analisando === s.id}
                                onClick={() => handleAnalise(s.id, false)}
                              >
                                <XCircle className="w-4 h-4" /> Recusar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog: solicitar criação de aluna (Assistente Social) */}
      <Dialog open={dialogNova} onOpenChange={setDialogNova}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar criação de conta de aluna</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSolicitar} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              A conta só será criada depois que a Gestão Geral aprovar a solicitação.
            </p>
            <div className="space-y-2">
              <Label>Núcleo</Label>
              <Select
                value={form.nucleo}
                onValueChange={(nucleo) => setForm((f) => ({ ...f, nucleo }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o núcleo..." />
                </SelectTrigger>
                <SelectContent>
                  {nucleos.map((nucleo) => (
                    <SelectItem key={nucleo.id} value={nucleo.codigo}>
                      {nucleo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha inicial</Label>
              <Input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogNova(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: detalhe + aprovação do cadastro de professor */}
      <ProfessorDialog
        solicitacao={profSelecionado}
        onClose={() => setProfSelecionado(null)}
        podeAnalisar={(isGestao || isAdministrativo) && profSelecionado?.status === 'PENDENTE'}
        analisando={!!profSelecionado && analisando === profSelecionado.id}
        onAprovar={() => {
          if (profSelecionado) handleAnalise(profSelecionado.id, true)
        }}
        onRecusar={() => {
          if (profSelecionado) handleAnalise(profSelecionado.id, false)
        }}
      />

      {/* Dialog: análise do perfil da candidata antes de aprovar a vaga */}
      <InscricaoDetailDialog
        inscricao={inscricaoDetalhe}
        open={!!inscricaoDetalhe}
        onOpenChange={(aberto) => {
          if (!aberto) setInscricaoDetalhe(null)
        }}
        podeDecidirVagaCrianca={podeAprovarInscricao}
      />
    </div>
  )
}

function ProfessorDialog({
  solicitacao,
  onClose,
  podeAnalisar,
  analisando,
  onAprovar,
  onRecusar,
}: {
  solicitacao: Solicitacao | null
  onClose: () => void
  podeAnalisar: boolean
  analisando: boolean
  onAprovar: () => void
  onRecusar: () => void
}) {
  if (!solicitacao) return null
  const dados = parseDados(solicitacao.dados)
  const documentos = dados.documentos ?? {}

  return (
    <Dialog open={!!solicitacao} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro de equipe</DialogTitle>
          <DialogDescription>
            Confira os dados do cadastro e aprove ou reprove. Os vínculos com projeto e turma são
            definidos depois, no cadastro do projeto e na tela do núcleo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {camposDetalhe.map((campo) => {
              const valor = dados[campo]
              if (valor === undefined || valor === null || valor === '') return null
              const texto =
                campo === 'projeto_contratante' ? projetoLabel(String(valor)) : String(valor)
              const largo =
                campo === 'endereco_residencial' ||
                campo === 'endereco_comercial' ||
                campo === 'dados_bancarios'
              return (
                <div key={campo} className={largo ? 'sm:col-span-2 space-y-0.5' : 'space-y-0.5'}>
                  <p className="text-xs text-muted-foreground">{campoLabels[campo] ?? campo}</p>
                  <p className="text-sm whitespace-pre-wrap">{texto}</p>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Documentos</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(documentos).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
              ) : (
                Object.entries(documentos).map(([tipo, arquivo]) => (
                  <a
                    key={tipo}
                    href={fileUrl(arquivo)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <FileText className="w-4 h-4 text-primary" />
                    {documentoLabels[tipo] ?? tipo}
                  </a>
                ))
              )}
            </div>
          </div>

          {podeAnalisar && (
            <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Aprovar cria a conta da pessoa. Para colocá-la em um projeto, use o cadastro do
              projeto; para definir a turma e a função dela, use a tela do núcleo.
            </p>
          )}
        </div>

        <DialogFooter>
          {podeAnalisar ? (
            <>
              <Button
                variant="outline"
                className="gap-1.5 text-rose-600 hover:text-rose-700"
                disabled={analisando}
                onClick={onRecusar}
              >
                <XCircle className="w-4 h-4" /> Recusar
              </Button>
              <Button
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                disabled={analisando}
                onClick={onAprovar}
              >
                {analisando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Aprovar cadastro
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
