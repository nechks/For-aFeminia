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
import { getNucleos, type Nucleo } from '@/services/nucleos'
import { getProjetos, type Projeto } from '@/services/projetos'
import { getTurmas, type Turma } from '@/services/turmas'
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
  UserPlus,
  XCircle,
} from 'lucide-react'

const TIPO_PROFESSOR = 'CADASTRO_PROFESSOR'
const TIPO_ALUNA = 'CRIACAO_ALUNA'

const statusBadge: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  APROVADA: { label: 'Aprovada', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  RECUSADA: { label: 'Recusada', color: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
}

const tipoLabel: Record<string, string> = {
  CRIACAO_ALUNA: 'Criação de conta de aluna',
  CADASTRO_PROFESSOR: 'Cadastro de equipe',
}

const tiposProfissionais = [
  { value: 'PROFESSORA_DEFESA_PESSOAL', label: 'Professora de Defesa Pessoal' },
  { value: 'AUXILIAR_DEFESA_PESSOAL', label: 'Auxiliar de Defesa Pessoal' },
  { value: 'ASSISTENTE_SOCIAL', label: 'Assistente Social' },
  { value: 'MEDIADORA_RODA_CONVERSA', label: 'Mediadora de Roda de Conversa' },
  { value: 'MONITOR_CRIANCA', label: 'Monitor de Criança' },
] as const

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
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [nucleos, setNucleos] = useState<Nucleo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogNova, setDialogNova] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [analisando, setAnalisando] = useState<string | null>(null)

  // Detalhe/aprovação do cadastro de professor
  const [profSelecionado, setProfSelecionado] = useState<Solicitacao | null>(null)
  const [projetoProfessor, setProjetoProfessor] = useState('')
  const [nucleoProfessor, setNucleoProfessor] = useState('')
  const [turmasProfessor, setTurmasProfessor] = useState<Turma[]>([])
  const [turmaProfessor, setTurmaProfessor] = useState('')
  const [tipoProfissional, setTipoProfissional] = useState('')

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('ALL')
  const [filtroStatus, setFiltroStatus] = useState('ALL')

  const isGestao = user?.perfil === 'GESTAO_GERAL'
  const isAdministrativo = user?.perfil === 'ADMINISTRATIVO'
  const isAssistente = user?.perfil === 'ASSISTENTE_SOCIAL'
  // Inscrições/matrículas são aprovadas pela Gestão e pelo Administrativo
  const podeAprovarInscricao = user?.perfil === 'GESTAO_GERAL' || user?.perfil === 'ADMINISTRATIVO'

  const load = useCallback(async () => {
    const [solicitacoesResult, inscricoesResult, projetosResult, nucleosResult] =
      await Promise.allSettled([
        getSolicitacoes(),
        getInscricoesPaginated({ status: 'AGUARDANDO', perPage: 200 }),
        getProjetos(),
        getNucleos(),
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

    if (projetosResult.status === 'fulfilled') {
      setProjetos(projetosResult.value.filter((p) => p.ativo))
    }
    if (nucleosResult.status === 'fulfilled') {
      const atuais = nucleosResult.value.filter((n) => n.ativo)
      setNucleos(atuais)
      Object.keys(turmaLabels).forEach((codigo) => delete turmaLabels[codigo])
      atuais.forEach((n) => {
        turmaLabels[n.codigo] = n.nome
      })
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

  // Aplicação dos filtros (client-side sobre o que já veio do backend por perfil).
  const mostrarInscricoes =
    (filtroTipo === 'ALL' || filtroTipo === 'INSCRICAO') &&
    (filtroStatus === 'ALL' || filtroStatus === 'PENDENTE')

  const solicitacoesFiltradas = useMemo(
    () =>
      solicitacoes.filter((s) => {
        if (filtroTipo !== 'ALL' && filtroTipo !== 'INSCRICAO' && s.tipo !== filtroTipo)
          return false
        if (filtroTipo === 'INSCRICAO') return false
        if (filtroStatus !== 'ALL' && s.status !== filtroStatus) return false
        return true
      }),
    [solicitacoes, filtroTipo, filtroStatus],
  )

  const inscricoesFiltradas = mostrarInscricoes ? inscricoesPendentes : []

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
    setEnviando(true)
    try {
      await solicitarCriacaoAluna(form)
      toast({
        title: 'Solicitação enviada!',
        description: 'A Gestão Geral vai analisar a criação da conta.',
      })
      setForm({ name: '', email: '', password: '' })
      setDialogNova(false)
      load()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setEnviando(false)
    }
  }

  // Aprovação/recusa das solicitações de conta (aluna direto; professor exige núcleo).
  const handleAnalise = async (
    id: string,
    aprovar: boolean,
    atribuicao?: { nucleo: string; turma_id: string; tipo_profissional: string },
  ) => {
    setAnalisando(id)
    try {
      if (aprovar) {
        await aprovarSolicitacao(id, atribuicao)
        toast({ title: 'Solicitação aprovada!', description: 'A conta foi criada.' })
      } else {
        await recusarSolicitacao(id)
        toast({ title: 'Solicitação recusada.' })
      }
      setProfSelecionado(null)
      setProjetoProfessor('')
      setNucleoProfessor('')
      setTurmasProfessor([])
      setTurmaProfessor('')
      setTipoProfissional('')
      load()
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setAnalisando(null)
    }
  }

  const abrirProfessor = (s: Solicitacao) => {
    setProfSelecionado(s)
    setProjetoProfessor('')
    setNucleoProfessor('')
    setTurmasProfessor([])
    setTurmaProfessor('')
    setTipoProfissional('')
  }

  const selecionarNucleoProfessor = async (codigo: string) => {
    setNucleoProfessor(codigo)
    setTurmaProfessor('')
    const nucleo = nucleos.find((n) => n.codigo === codigo)
    if (!nucleo) {
      setTurmasProfessor([])
      return
    }
    try {
      const lista = await getTurmas(nucleo.id)
      setTurmasProfessor(lista.filter((t) => t.ativo))
    } catch (err) {
      setTurmasProfessor([])
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const semResultados = solicitacoesFiltradas.length === 0 && inscricoesFiltradas.length === 0

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
          <Button className="gap-2 shrink-0" onClick={() => setDialogNova(true)}>
            <UserPlus className="w-4 h-4" /> Solicitar criação de aluna
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full sm:w-[240px]">
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
            <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

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
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">Inscrição — {i.nome_completo}</span>
                          <Badge className={statusBadge.PENDENTE.color} variant="secondary">
                            Aguardando
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {turmaLabels[i.turma ?? ''] ?? i.turma ?? 'Sem turma'}
                          {i.email ? ` · ${i.email}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inscrita em{' '}
                          {i.created ? new Date(i.created).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                      {podeAprovarInscricao && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={analisando === i.id}
                            onClick={() => handleInscricao(i.id, true)}
                          >
                            {analisando === i.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-1.5 text-rose-600 hover:text-rose-700"
                            disabled={analisando === i.id}
                            onClick={() => handleInscricao(i.id, false)}
                          >
                            <XCircle className="w-4 h-4" /> Lista de espera
                          </Button>
                        </div>
                      )}
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
                    <CardContent className="pt-6">
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
        projetos={projetos}
        nucleos={nucleos}
        turmas={turmasProfessor}
        projeto={projetoProfessor}
        onProjetoChange={(id) => {
          setProjetoProfessor(id)
          setNucleoProfessor('')
          setTurmasProfessor([])
          setTurmaProfessor('')
        }}
        nucleo={nucleoProfessor}
        onNucleoChange={selecionarNucleoProfessor}
        turma={turmaProfessor}
        onTurmaChange={setTurmaProfessor}
        tipoProfissional={tipoProfissional}
        onTipoProfissionalChange={setTipoProfissional}
        analisando={!!profSelecionado && analisando === profSelecionado.id}
        onAprovar={() => {
          if (!profSelecionado) return
          if (!projetoProfessor || !nucleoProfessor || !turmaProfessor || !tipoProfissional) {
            toast({
              title: 'Preencha projeto, núcleo, turma e tipo profissional',
              variant: 'destructive',
            })
            return
          }
          handleAnalise(profSelecionado.id, true, {
            nucleo: nucleoProfessor,
            turma_id: turmaProfessor,
            tipo_profissional: tipoProfissional,
          })
        }}
        onRecusar={() => {
          if (profSelecionado) handleAnalise(profSelecionado.id, false)
        }}
      />
    </div>
  )
}

function ProfessorDialog({
  solicitacao,
  onClose,
  podeAnalisar,
  projetos,
  nucleos,
  turmas,
  projeto,
  onProjetoChange,
  nucleo,
  onNucleoChange,
  turma,
  onTurmaChange,
  tipoProfissional,
  onTipoProfissionalChange,
  analisando,
  onAprovar,
  onRecusar,
}: {
  solicitacao: Solicitacao | null
  onClose: () => void
  podeAnalisar: boolean
  projetos: Projeto[]
  nucleos: Nucleo[]
  turmas: Turma[]
  projeto: string
  onProjetoChange: (v: string) => void
  nucleo: string
  onNucleoChange: (v: string) => void
  turma: string
  onTurmaChange: (v: string) => void
  tipoProfissional: string
  onTipoProfissionalChange: (v: string) => void
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
            Confira os dados e defina onde e como este membro da equipe atuará.
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
            <div className="grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Projeto *</Label>
                <Select value={projeto} onValueChange={onProjetoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Núcleo *</Label>
                <Select value={nucleo} onValueChange={onNucleoChange} disabled={!projeto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o núcleo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nucleos
                      .filter((item) => item.projeto_id === projeto)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.codigo}>
                          {item.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turma *</Label>
                <Select value={turma} onValueChange={onTurmaChange} disabled={!nucleo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome} · {item.turno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo profissional *</Label>
                <Select value={tipoProfissional} onValueChange={onTipoProfissionalChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposProfissionais.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Todos os tipos podem realizar chamadas, exceto Monitor de Criança.
              </p>
            </div>
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
                Aprovar e criar conta
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
