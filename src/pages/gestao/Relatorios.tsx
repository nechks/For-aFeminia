import { useState, useEffect, useCallback } from 'react'
import { Atendimento } from '@/lib/types'
import {
  getRelatorioAtendimentos,
  gerarRelatorioConfidencial,
  buscarAlunas,
  getFichaConsolidada,
  exportarAtendimentosExcel,
  FiltrosAtendimentos,
  AlunaRelatorio,
  FichaConsolidada,
  getDadosNucleo,
  exportarDadosNucleo,
  DadosNucleo,
} from '@/services/relatorios'
import { turmaLabels, getStatusInfo } from '@/lib/constants'
import { fileUrl, ApiError } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileBarChart,
  FileSpreadsheet,
  Globe,
  Lock,
  Loader2,
  Search,
  Eye,
  ShieldCheck,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  UserCheck,
  Check,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { useApp } from '@/store/app-context'
import { formSections } from '@/lib/confirmacao-fields'

const formatarData = (iso?: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

/* ------------------------------------------------------------------ */
/* Diálogo com o conteúdo completo de um atendimento (relatório final) */
/* ------------------------------------------------------------------ */

function RelatorioDialog({
  atendimento,
  onClose,
}: {
  atendimento: Atendimento | null
  onClose: () => void
}) {
  if (!atendimento) return null
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Relatório de Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>
              <strong>Data:</strong> {formatarData(atendimento.data)}
            </span>
            <span>
              <strong>Horário:</strong> {atendimento.horario}
            </span>
            <span>
              <strong>Núcleo:</strong> {turmaLabels[atendimento.turma] ?? atendimento.turma}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>
              <strong>Aluna:</strong> {atendimento.expand?.aluna_id?.name ?? '—'}
            </span>
            <span>
              <strong>Registrado por:</strong> {atendimento.expand?.created_by?.name ?? '—'}
            </span>
          </div>
          <div className="rounded-md bg-muted/50 border p-4 whitespace-pre-wrap leading-relaxed">
            {atendimento.relatorio}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------- */
/* Diálogo de reautenticação do autor para atendimentos confidenciais   */
/* ------------------------------------------------------------------- */

function ConfidencialDialog({
  atendimento,
  onClose,
  onLiberado,
}: {
  atendimento: Atendimento | null
  onClose: () => void
  onLiberado: (completo: Atendimento) => void
}) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [validando, setValidando] = useState(false)

  useEffect(() => {
    setEmail('')
    setSenha('')
    setErro('')
  }, [atendimento?.id])

  if (!atendimento) return null
  const autor = atendimento.expand?.created_by?.name ?? 'o autor do registro'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidando(true)
    setErro('')
    try {
      const completo = await gerarRelatorioConfidencial(atendimento.id, email.trim(), senha)
      onLiberado(completo)
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Credenciais inválidas.')
    } finally {
      setValidando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" /> Relatório Confidencial
          </DialogTitle>
          <DialogDescription>
            Este conteúdo só é liberado com a autorização de quem registrou o atendimento ({autor}).
            Peça que a pessoa digite o próprio e-mail e senha — não são as credenciais da Gestão.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>E-mail do autor</Label>
            <Input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Senha do autor</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={validando}>
              {validando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Liberar relatório
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------- */
/* Lista de atendimentos compartilhada entre as abas  */
/* ------------------------------------------------- */

function TabelaAtendimentos({ lista }: { lista: Atendimento[] }) {
  const [detalhe, setDetalhe] = useState<Atendimento | null>(null)
  const [confidencial, setConfidencial] = useState<Atendimento | null>(null)

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Núcleo</TableHead>
              <TableHead>Aluna</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((a) => {
              const isConfidencial = a.tipo_acesso === 'CONFIDENCIAL'
              return (
                <TableRow key={a.id}>
                  <TableCell>{formatarData(a.data)}</TableCell>
                  <TableCell>{a.horario}</TableCell>
                  <TableCell>{turmaLabels[a.turma] ?? a.turma}</TableCell>
                  <TableCell className="font-medium">{a.expand?.aluna_id?.name ?? '—'}</TableCell>
                  <TableCell>{a.expand?.created_by?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        isConfidencial
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                      }
                    >
                      {isConfidencial ? (
                        <>
                          <Lock className="h-3 w-3 mr-1" /> Confidencial
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3 mr-1" /> Público
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isConfidencial ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setConfidencial(a)}
                      >
                        <Lock className="h-3.5 w-3.5" /> Gerar relatório confidencial
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setDetalhe(a)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Gerar relatório
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <RelatorioDialog atendimento={detalhe} onClose={() => setDetalhe(null)} />
      <ConfidencialDialog
        atendimento={confidencial}
        onClose={() => setConfidencial(null)}
        onLiberado={(completo) => {
          setConfidencial(null)
          setDetalhe(completo)
        }}
      />
    </>
  )
}

/* ---------------------------- */
/* Sub-aba 1: Atendimentos      */
/* ---------------------------- */

function AtendimentosTab() {
  const [filtros, setFiltros] = useState<FiltrosAtendimentos>({
    turma: '',
    busca: '',
    inicio: '',
    fim: '',
    tipo: 'TODOS',
  })
  const [lista, setLista] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)

  const load = useCallback(async (f: FiltrosAtendimentos) => {
    setLoading(true)
    try {
      setLista(await getRelatorioAtendimentos(f))
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar atendimentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filtros)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExportar = async () => {
    setExportando(true)
    try {
      await exportarAtendimentosExcel(filtros)
    } catch {
      toast({ title: 'Erro ao exportar planilha', variant: 'destructive' })
    } finally {
      setExportando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Atendimentos</CardTitle>
        <CardDescription>
          Atendimentos públicos são gerados diretamente. Confidenciais exigem e-mail e senha de quem
          criou o registro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Núcleo</Label>
            <Select
              value={filtros.turma || 'TODAS'}
              onValueChange={(v) => setFiltros((f) => ({ ...f, turma: v === 'TODAS' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todos os núcleos</SelectItem>
                {Object.entries(turmaLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aluna (nome ou CPF)</Label>
            <Input
              placeholder="Buscar aluna..."
              value={filtros.busca}
              onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={filtros.inicio}
              onChange={(e) => setFiltros((f) => ({ ...f, inicio: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              value={filtros.fim}
              onChange={(e) => setFiltros((f) => ({ ...f, fim: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de acesso</Label>
            <Select
              value={filtros.tipo}
              onValueChange={(v) => setFiltros((f) => ({ ...f, tipo: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PUBLICO">Público</SelectItem>
                <SelectItem value="CONFIDENCIAL">Confidencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => load(filtros)} className="gap-2">
            <Search className="h-4 w-4" /> Filtrar
          </Button>
          <Button
            variant="outline"
            onClick={handleExportar}
            disabled={exportando || lista.length === 0}
            className="gap-2"
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exportar Excel
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 space-y-2">
            <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
            <p>Nenhum atendimento encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <TabelaAtendimentos lista={lista} />
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------------------- */
/* Sub-aba 2: Relatório de Aluna */
/* ---------------------------- */

function CampoInfo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-medium">{valor || '—'}</p>
    </div>
  )
}

/** Seções da ficha de confirmação são JSON — exibe os pares chave/valor de forma legível. */
const rotulosConfirmacao: Record<string, string> = {
  tem_filhos: 'Tem filhos',
  tem_rede_apoio_filhos: 'Tem rede de apoio para os filhos',
  precisa_levar_filhos: 'Precisa levar os filhos',
  criancas: 'Crianças que serão levadas',
}

function formatarValorConfirmacao(chave: string, valor: unknown): string {
  if (chave === 'criancas' && Array.isArray(valor)) {
    return valor
      .map((item) => {
        const crianca = item as { nome?: string; idade?: string | number }
        return `${crianca.nome ?? '—'} (${crianca.idade ?? '—'} anos)`
      })
      .join('; ')
  }
  if (Array.isArray(valor)) return valor.join(', ')
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (valor && typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

function SecaoConfirmacao({ titulo, json }: { titulo: string; json?: string | null }) {
  if (!json) return null
  let dados: Record<string, unknown>
  try {
    dados = JSON.parse(json)
  } catch {
    return null
  }
  const entradas = Object.entries(dados).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  )
  if (entradas.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold">{titulo}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {entradas.map(([k, v]) => (
          <p key={k} className="text-xs text-muted-foreground">
            <strong className="text-foreground font-medium">
              {rotulosConfirmacao[k] ?? k.replace(/_/g, ' ')}:
            </strong>{' '}
            {formatarValorConfirmacao(k, v)}
          </p>
        ))}
      </div>
    </div>
  )
}

function FichaAluna({ ficha, onVoltar }: { ficha: FichaConsolidada; onVoltar: () => void }) {
  const insc = ficha.inscricao
  const status = getStatusInfo(insc.status)
  const parseRespostas = (json: string): { pergunta: string; resposta: string }[] => {
    try {
      const arr = JSON.parse(json)
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={onVoltar}>
        <ArrowLeft className="h-4 w-4" /> Voltar à busca
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{insc.nome_completo}</CardTitle>
              <CardDescription>
                {turmaLabels[insc.turma ?? ''] ?? insc.turma ?? '—'} · CPF {insc.cpf}
              </CardDescription>
            </div>
            <Badge variant="secondary" className={status.color}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <CampoInfo rotulo="RG" valor={insc.rg} />
          <CampoInfo rotulo="Nascimento" valor={formatarData(insc.data_nascimento)} />
          <CampoInfo rotulo="Telefone" valor={insc.telefone} />
          <CampoInfo rotulo="E-mail" valor={insc.email} />
          <CampoInfo rotulo="Endereço" valor={insc.endereco} />
          <CampoInfo rotulo="Bairro" valor={insc.bairro} />
          <CampoInfo rotulo="Cidade" valor={insc.cidade} />
          <CampoInfo rotulo="Estado" valor={insc.estado} />
          <CampoInfo rotulo="CEP" valor={insc.cep} />
          <CampoInfo rotulo="1ª aula" valor={formatarData(insc.data_primeira_aula)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Frequência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-6 text-sm">
            <span>
              Aulas registradas: <strong>{ficha.frequencia.total_aulas}</strong>
            </span>
            <span className="text-emerald-600">
              Presenças: <strong>{ficha.frequencia.presencas}</strong>
            </span>
            <span className="text-rose-600">
              Faltas: <strong>{ficha.frequencia.faltas}</strong>
            </span>
          </div>
          {ficha.frequencia.registros.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
              {ficha.frequencia.registros.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span>{formatarData(p.data_aula)}</span>
                  <span className="flex items-center gap-2">
                    {!p.presente && p.justificativa && (
                      <span className="text-xs text-muted-foreground italic">
                        {p.justificativa}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={
                        p.presente
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                      }
                    >
                      {p.presente ? 'Presente' : 'Falta'}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Atendimentos
          </CardTitle>
          <CardDescription>
            Confidenciais aparecem mascarados até a reautenticação do autor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ficha.atendimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
          ) : (
            <TabelaAtendimentos lista={ficha.atendimentos} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ficha.eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma inscrição em eventos.</p>
          ) : (
            <div className="space-y-3">
              {ficha.eventos.map((e) => (
                <div key={e.id} className="rounded-md border p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{e.titulo}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatarData(e.data_evento)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          e.presente === null
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                            : e.presente
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                        }
                      >
                        {e.presente === null
                          ? 'Não registrado'
                          : e.presente
                            ? 'Compareceu'
                            : 'Não compareceu'}
                      </Badge>
                    </span>
                  </div>
                  {parseRespostas(e.respostas).map((r, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      <strong>{r.pergunta}:</strong> {r.resposta}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ficha.confirmacao && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ficha de Confirmação</CardTitle>
            <CardDescription>Dados declarados pela aluna nas seções 1–8.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SecaoConfirmacao titulo="1. Dados pessoais" json={ficha.confirmacao.secao_1_dados} />
            <SecaoConfirmacao titulo="2. Endereço" json={ficha.confirmacao.secao_2_dados} />
            <SecaoConfirmacao
              titulo="3. Dados profissionais"
              json={ficha.confirmacao.secao_3_dados}
            />
            <SecaoConfirmacao titulo="4. Saúde" json={ficha.confirmacao.secao_4_dados} />
            <SecaoConfirmacao titulo="5. Uniforme e turma" json={ficha.confirmacao.secao_5_dados} />
            <SecaoConfirmacao
              titulo="6. Perfil socioeconômico"
              json={ficha.confirmacao.secao_6_socioeconomico}
            />
            <SecaoConfirmacao
              titulo="7. Histórico de violência"
              json={ficha.confirmacao.secao_7_violencia}
            />
            <SecaoConfirmacao
              titulo="8. Declarações finais"
              json={ficha.confirmacao.secao_8_declaracoes}
            />
            {ficha.documentos.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold">Documentos anexos</p>
                <div className="flex flex-wrap gap-2">
                  {ficha.documentos.map((d) => (
                    <a
                      key={d.id}
                      href={fileUrl(d.arquivo)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline text-primary"
                    >
                      {d.tipo}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AlunaTab() {
  const [turma, setTurma] = useState('')
  const [busca, setBusca] = useState('')
  const [alunas, setAlunas] = useState<AlunaRelatorio[]>([])
  const [buscou, setBuscou] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [carregandoFicha, setCarregandoFicha] = useState(false)
  const [ficha, setFicha] = useState<FichaConsolidada | null>(null)

  const handleBuscar = async () => {
    if (!turma) return
    setBuscando(true)
    try {
      setAlunas(await buscarAlunas(turma, busca.trim() || undefined))
      setBuscou(true)
    } catch {
      toast({ title: 'Erro ao buscar alunas', variant: 'destructive' })
    } finally {
      setBuscando(false)
    }
  }

  const abrirFicha = async (aluna: AlunaRelatorio) => {
    setCarregandoFicha(true)
    try {
      setFicha(await getFichaConsolidada(aluna.user_id))
    } catch {
      toast({ title: 'Erro ao carregar a ficha da aluna', variant: 'destructive' })
    } finally {
      setCarregandoFicha(false)
    }
  }

  if (ficha) return <FichaAluna ficha={ficha} onVoltar={() => setFicha(null)} />

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Aluna</CardTitle>
        <CardDescription>
          Escolha o núcleo e busque por nome ou CPF para abrir a ficha consolidada da aluna.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">1. Núcleo</Label>
            <Select value={turma} onValueChange={setTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o núcleo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(turmaLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">2. Nome ou CPF</Label>
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              disabled={!turma}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleBuscar()
                }
              }}
            />
          </div>
          <Button onClick={handleBuscar} disabled={!turma || buscando} className="gap-2">
            {buscando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>
        </div>

        {carregandoFicha ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : buscou && alunas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma aluna aprovada encontrada neste núcleo com essa busca.
          </p>
        ) : (
          alunas.length > 0 && (
            <div className="rounded-md border divide-y">
              {alunas.map((a) => (
                <button
                  key={a.user_id}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => abrirFicha(a)}
                >
                  <span className="text-sm font-medium">{a.nome_completo}</span>
                  <span className="text-xs text-muted-foreground">CPF {a.cpf}</span>
                </button>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

const camposCadastro = [
  ['nome_completo', 'Nome completo'],
  ['cpf', 'CPF'],
  ['rg', 'RG'],
  ['data_nascimento', 'Data de nascimento'],
  ['telefone', 'Telefone'],
  ['email', 'E-mail'],
  ['endereco', 'Endereço'],
  ['bairro', 'Bairro'],
  ['cidade', 'Cidade'],
  ['estado', 'Estado'],
  ['cep', 'CEP'],
  ['nucleo', 'Núcleo'],
  ['faltas', 'Número de faltas'],
  ['inicio_projeto', 'Início do projeto'],
  ['termino_projeto', 'Término do projeto'],
] as const

function DadosNucleoTab() {
  const { user } = useApp()
  const [turma, setTurma] = useState('')
  const [inicio, setInicio] = useState('')
  const [termino, setTermino] = useState('')
  const [campos, setCampos] = useState<string[]>(['nome_completo', 'faltas'])
  const [dados, setDados] = useState<DadosNucleo | null>(null)
  const [loading, setLoading] = useState(false)
  const camposNucleo = [
    ...camposCadastro.map(([chave, rotulo]) => ({ chave, rotulo, grupo: 'Cadastro' })),
    ...formSections
      .filter((secao) => !secao.confidential || user?.perfil === 'GESTAO_GERAL')
      .flatMap((secao) =>
        secao.fields.map((campo) => ({
          chave: `confirmacao.${campo.name}`,
          rotulo: campo.label,
          grupo: `Ficha de Confirmação — ${secao.title}`,
        })),
      ),
  ]

  const alternar = (campo: string) => {
    setCampos((atuais) =>
      atuais.includes(campo) ? atuais.filter((c) => c !== campo) : [...atuais, campo],
    )
    setDados(null)
  }
  const gerar = async () => {
    if (!turma || campos.length === 0) {
      toast({
        title: !turma ? 'Selecione o núcleo' : 'Selecione pelo menos um dado',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      setDados(await getDadosNucleo(turma, campos, inicio, termino))
    } catch {
      toast({ title: 'Erro ao gerar a tabela', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  const exportar = async () => {
    setLoading(true)
    try {
      await exportarDadosNucleo(turma, campos, inicio, termino)
    } catch {
      toast({ title: 'Erro ao exportar a planilha', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar dados do núcleo</CardTitle>
        <CardDescription>
          Escolha o núcleo e clique nos dados que devem aparecer como colunas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Núcleo *</Label>
            <Select
              value={turma}
              onValueChange={(v) => {
                setTurma(v)
                setDados(null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(turmaLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Início do projeto</Label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value)
                setDados(null)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Término do projeto</Label>
            <Input
              type="date"
              value={termino}
              onChange={(e) => {
                setTermino(e.target.value)
                setDados(null)
              }}
            />
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Label>Dados para exportar *</Label>
            <span className="text-xs text-muted-foreground">{campos.length} selecionado(s)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {camposNucleo.map(({ chave, rotulo, grupo }) => {
              const ativo = campos.includes(chave)
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => alternar(chave)}
                  aria-pressed={ativo}
                  className={`min-h-20 rounded-lg border p-3 text-left text-sm transition-colors ${ativo ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                >
                  <span className="flex items-start gap-2">
                    {ativo && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>
                      <span className="block font-medium">{rotulo}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{grupo}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={gerar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar tabela
          </Button>
          <Button
            variant="outline"
            onClick={exportar}
            disabled={loading || !dados || dados.linhas.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
        {dados &&
          (dados.linhas.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma aluna aprovada encontrada neste núcleo.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {dados.colunas.map((c) => (
                      <TableHead key={c.chave}>{c.rotulo}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.linhas.map((linha, i) => (
                    <TableRow key={i}>
                      {dados.colunas.map((c) => (
                        <TableCell key={c.chave} className="whitespace-nowrap">
                          {String(linha[c.chave] ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

/* ------------- */
/* Página        */
/* ------------- */

export default function Relatorios() {
  const { user } = useApp()
  const isGestao = user?.perfil === 'GESTAO_GERAL'
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-7 w-7 text-primary" /> Relatórios
        </h1>
        <p className="text-muted-foreground mt-1">
          Relatórios e exportações disponíveis para Administração e Gestão Geral.
        </p>
      </div>

      <Tabs defaultValue={isGestao ? 'atendimentos' : 'nucleo'}>
        <TabsList>
          {isGestao && <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>}
          {isGestao && <TabsTrigger value="aluna">Relatório de Aluna</TabsTrigger>}
          <TabsTrigger value="nucleo">Dados do Núcleo</TabsTrigger>
        </TabsList>
        {isGestao && (
          <TabsContent value="atendimentos" className="mt-4">
            <AtendimentosTab />
          </TabsContent>
        )}
        {isGestao && (
          <TabsContent value="aluna" className="mt-4">
            <AlunaTab />
          </TabsContent>
        )}
        <TabsContent value="nucleo" className="mt-4">
          <DadosNucleoTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
