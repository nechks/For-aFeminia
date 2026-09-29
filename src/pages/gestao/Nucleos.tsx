import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  criarZonaPrioritaria,
  criarNucleo,
  editarNucleo,
  editarZonaPrioritaria,
  excluirNucleo,
  excluirZonaPrioritaria,
  getNucleos,
  getNucleosResumo,
  getZonasPrioritarias,
  type Nucleo,
  type NucleoResumo,
  type ZonaPrioritaria,
} from '@/services/nucleos'
import { getProjetos, type Projeto } from '@/services/projetos'
import { getErrorMessage } from '@/lib/api/errors'
import { useApp } from '@/store/app-context'
import { buscarCep, formatCep } from '@/lib/viacep'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Building2, ChevronRight, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const vazio = {
  projeto_id: '',
  nome: '',
  endereco: '',
  bairro: '',
  cidade: '',
  estado: 'ES',
  cep: '',
  telefone: '',
  capacidade: '',
}

const bairrosExemplo = [
  'Centro',
  'Parque Moscoso',
  'Do Moscoso',
  'Vila Rubim',
  'Mário Cypreste',
  'Ilha de Santa Maria',
  'Caratoíra',
  'Santa Martha',
  'Bonfim',
  'Consolação',
  'Jesus de Nazareth',
  'Da Penha',
  "Joana D'arc",
  'Estrelinha',
  'Maria Ortiz',
  'Jabour',
]

const zonaVazia = {
  nome: '',
  cidade: 'Vitória',
  estado: 'ES',
  ponto_entrada: '',
  ponto_saida: '',
  bairrosTexto: '',
}

const separarBairros = (texto: string) => {
  const unicos = new Map<string, string>()
  texto.split(/[\n,;]+/).forEach((valor) => {
    const bairro = valor.trim().replace(/\s+/g, ' ')
    if (bairro) unicos.set(bairro.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(), bairro)
  })
  return [...unicos.values()]
}

/**
 * Lista enxuta de núcleos: o card traz só a identificação e os contadores. Turmas, equipe e alunas
 * ficam na tela do núcleo (/gestao/nucleos/:id), para a lista não crescer junto com a operação.
 */
export default function Nucleos() {
  const navigate = useNavigate()
  const { user } = useApp()
  // Criar e excluir núcleo são exclusivos da Gestão Geral no backend; o Administrativo entra
  // no núcleo para gerenciar equipe e alunas, então some com os botões que ele não pode usar.
  const podeGerenciar = user?.perfil === 'GESTAO_GERAL'
  const podeGerenciarZonas =
    user?.perfil === 'GESTAO_GERAL' || user?.perfil === 'ADMINISTRATIVO'
  const [lista, setLista] = useState<Nucleo[]>([])
  const [resumo, setResumo] = useState<NucleoResumo[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [zonas, setZonas] = useState<ZonaPrioritaria[]>([])
  const [open, setOpen] = useState(false)
  // Núcleo em edição; nulo = o diálogo está criando um núcleo novo.
  const [editando, setEditando] = useState<Nucleo | null>(null)
  const [form, setForm] = useState(vazio)
  const [loading, setLoading] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [nucleoExcluir, setNucleoExcluir] = useState<Nucleo | null>(null)
  const [senha, setSenha] = useState('')
  const [zonasOpen, setZonasOpen] = useState(false)
  const [zonaForm, setZonaForm] = useState<typeof zonaVazia | null>(null)
  const [zonaEditandoId, setZonaEditandoId] = useState<string | null>(null)
  const [zonaExcluir, setZonaExcluir] = useState<ZonaPrioritaria | null>(null)

  const load = async () => {
    const [n, p, r, z] = await Promise.all([
      getNucleos(),
      getProjetos(),
      getNucleosResumo(),
      getZonasPrioritarias(),
    ])
    setLista(n)
    setProjetos(p.filter((x) => x.ativo))
    setResumo(r)
    setZonas(z)
  }

  useEffect(() => {
    load().catch((e) =>
      toast({
        title: 'Erro ao carregar dados',
        description: getErrorMessage(e),
        variant: 'destructive',
      }),
    )
  }, [])

  const projetosPorId = useMemo(
    () => Object.fromEntries(projetos.map((p) => [p.id, p])),
    [projetos],
  )
  const resumoPorId = useMemo(
    () => Object.fromEntries(resumo.map((r) => [r.nucleo_id, r])),
    [resumo],
  )

  /**
   * Vagas que sobram no projeto escolhido: o teto dele menos a capacidade já comprometida pelos
   * outros núcleos. Espelha a validação do backend para o erro aparecer antes de salvar.
   */
  const vagasDisponiveis = useMemo(() => {
    const projeto = projetosPorId[form.projeto_id]
    if (!projeto?.capacidadeAlunas) return null
    const comprometido = lista
      .filter((n) => n.projeto_id === form.projeto_id && n.id !== editando?.id)
      .reduce((total, n) => total + (n.capacidade ?? 0), 0)
    return Math.max(projeto.capacidadeAlunas - comprometido, 0)
  }, [form.projeto_id, lista, projetosPorId, editando])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const preencherCep = async (valor: string) => {
    const cep = formatCep(valor)
    set('cep', cep)
    if (cep.replace(/\D/g, '').length !== 8) return
    setBuscandoCep(true)
    const endereco = await buscarCep(cep)
    setBuscandoCep(false)
    if (!endereco) {
      toast({
        title: 'CEP não encontrado',
        description: 'Confira o número ou preencha o endereço manualmente.',
        variant: 'destructive',
      })
      return
    }
    setForm((f) => ({
      ...f,
      cep,
      endereco: endereco.logradouro || f.endereco,
      bairro: endereco.bairro || f.bairro,
      cidade: endereco.cidade || f.cidade,
      estado: endereco.estado || f.estado,
    }))
  }

  const abrirNovo = () => {
    setEditando(null)
    setForm(vazio)
    setOpen(true)
  }

  const abrirEdicao = (n: Nucleo) => {
    setEditando(n)
    setForm({
      projeto_id: n.projeto_id ?? '',
      nome: n.nome ?? '',
      endereco: n.endereco ?? '',
      bairro: n.bairro ?? '',
      cidade: n.cidade ?? '',
      estado: n.estado ?? 'ES',
      cep: n.cep ?? '',
      telefone: n.telefone ?? '',
      capacidade: n.capacidade == null ? '' : String(n.capacidade),
    })
    setOpen(true)
  }

  const salvar = async () => {
    setLoading(true)
    const payload = { ...form, capacidade: Number(form.capacidade) || undefined }
    try {
      if (editando) {
        // O projeto do núcleo é a identidade dele para turmas e inscrições, então não vai no PUT.
        await editarNucleo(editando.id, { ...payload, ativo: editando.ativo })
        toast({ title: '🏠 Núcleo atualizado!' })
      } else {
        await criarNucleo(payload)
        toast({ title: '🏠 Núcleo criado!' })
      }
      setOpen(false)
      setEditando(null)
      setForm(vazio)
      load()
    } catch (e) {
      toast({
        title: editando ? 'Erro ao atualizar núcleo' : 'Erro ao criar núcleo',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!nucleoExcluir || !senha) return
    setLoading(true)
    try {
      await excluirNucleo(nucleoExcluir.id, senha)
      toast({ title: 'Núcleo excluído.' })
      setNucleoExcluir(null)
      setSenha('')
      load()
    } catch (e) {
      toast({
        title: 'Não foi possível excluir',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirNovaZona = () => {
    setZonaEditandoId(null)
    setZonaForm({ ...zonaVazia })
  }

  const abrirEdicaoZona = (zona: ZonaPrioritaria) => {
    setZonaEditandoId(zona.id)
    setZonaForm({
      nome: zona.nome,
      cidade: zona.cidade,
      estado: zona.estado,
      ponto_entrada: zona.ponto_entrada ?? '',
      ponto_saida: zona.ponto_saida ?? '',
      bairrosTexto: zona.bairros.join('\n'),
    })
  }

  const salvarZona = async () => {
    if (!zonaForm) return
    const bairros = separarBairros(zonaForm.bairrosTexto)
    if (!zonaForm.nome.trim() || !zonaForm.cidade.trim() || zonaForm.estado.length !== 2 || !bairros.length)
      return
    setLoading(true)
    const dados = {
      nome: zonaForm.nome,
      cidade: zonaForm.cidade,
      estado: zonaForm.estado,
      ponto_entrada: zonaForm.ponto_entrada,
      ponto_saida: zonaForm.ponto_saida,
      bairros,
    }
    try {
      if (zonaEditandoId) await editarZonaPrioritaria(zonaEditandoId, dados)
      else await criarZonaPrioritaria(dados)
      toast({ title: zonaEditandoId ? '🗺️ Zona atualizada!' : '🗺️ Zona criada!' })
      setZonaForm(null)
      setZonaEditandoId(null)
      await load()
    } catch (e) {
      toast({ title: 'Não foi possível salvar a zona', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const confirmarExclusaoZona = async () => {
    if (!zonaExcluir) return
    setLoading(true)
    try {
      await excluirZonaPrioritaria(zonaExcluir.id)
      toast({ title: `Zona ${zonaExcluir.nome} excluída.` })
      setZonaExcluir(null)
      await load()
    } catch (e) {
      toast({
        title: 'Não foi possível excluir a zona',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🏠 Núcleos</h1>
          <p className="text-muted-foreground">
            Abra um núcleo para gerenciar turmas, equipe e alunas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeGerenciarZonas && (
            <Button variant="outline" onClick={() => setZonasOpen(true)}>
              <MapPin className="mr-2 h-4 w-4" />
              Zonas prioritárias
            </Button>
          )}
          {podeGerenciar && (
            <Button onClick={abrirNovo} disabled={!projetos.length}>
              <Plus className="mr-2 h-4 w-4" />
              Novo núcleo
            </Button>
          )}
        </div>
      </div>
      {podeGerenciar && !projetos.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠️ Crie um projeto antes de cadastrar o primeiro núcleo.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((n) => {
          const r = resumoPorId[n.id]
          return (
            <Card
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/gestao/nucleos/${n.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/gestao/nucleos/${n.id}`)
                }
              }}
              className="cursor-pointer overflow-hidden shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="h-1.5 bg-marca" />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-primary">
                      📁 {projetosPorId[n.projeto_id ?? '']?.nome ?? 'Projeto não associado'}
                    </p>
                    <CardTitle className="mt-1.5 flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{n.nome}</span>
                    </CardTitle>
                  </div>
                  {podeGerenciar && (
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirEdicao(n)
                        }}
                        title="Editar núcleo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNucleoExcluir(n)
                        }}
                        title="Excluir núcleo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">
                    {[n.bairro, n.cidade, n.estado].filter(Boolean).join(', ') ||
                      'Endereço não informado'}
                  </span>
                </p>
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex gap-4 text-muted-foreground">
                    <span>🎓 {r?.turmas ?? 0}</span>
                    <span>👥 {r?.equipe ?? 0}</span>
                    <span>🙋‍♀️ {r?.alunas ?? 0}</span>
                    <span title="Zonas prioritárias vinculadas">
                      🗺️ {n.zonas_prioritarias?.length ?? 0}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    Abrir <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Cadastro global: uma zona pode ser reutilizada em quantos núcleos forem necessários. */}
      <Dialog
        open={zonasOpen}
        onOpenChange={(aberto) => {
          setZonasOpen(aberto)
          if (!aberto) {
            setZonaForm(null)
            setZonaEditandoId(null)
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>🗺️ Zonas prioritárias</DialogTitle>
          </DialogHeader>

          {zonaForm ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome da zona *</Label>
                  <Input
                    value={zonaForm.nome}
                    onChange={(e) => setZonaForm({ ...zonaForm, nome: e.target.value })}
                    placeholder="Ex.: Zona Centro a Jabour"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Município *</Label>
                  <Input
                    value={zonaForm.cidade}
                    onChange={(e) => setZonaForm({ ...zonaForm, cidade: e.target.value })}
                    placeholder="Ex.: Vitória"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF *</Label>
                  <Input
                    maxLength={2}
                    value={zonaForm.estado}
                    onChange={(e) =>
                      setZonaForm({ ...zonaForm, estado: e.target.value.toUpperCase() })
                    }
                    placeholder="ES"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ponto inicial de referência</Label>
                  <Input
                    value={zonaForm.ponto_entrada}
                    onChange={(e) => setZonaForm({ ...zonaForm, ponto_entrada: e.target.value })}
                    placeholder="Ex.: Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ponto final de referência</Label>
                  <Input
                    value={zonaForm.ponto_saida}
                    onChange={(e) => setZonaForm({ ...zonaForm, ponto_saida: e.target.value })}
                    placeholder="Ex.: Jabour"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Lista de bairros *</Label>
                    {!zonaEditandoId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setZonaForm({
                            nome: 'Zona Centro a Jabour',
                            cidade: 'Vitória',
                            estado: 'ES',
                            ponto_entrada: 'Centro',
                            ponto_saida: 'Jabour',
                            bairrosTexto: bairrosExemplo.join('\n'),
                          })
                        }
                      >
                        Preencher exemplo informado
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={12}
                    value={zonaForm.bairrosTexto}
                    onChange={(e) => setZonaForm({ ...zonaForm, bairrosTexto: e.target.value })}
                    placeholder={'Centro\nParque Moscoso\nVila Rubim'}
                  />
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Cole todos de uma vez, separados por linha, vírgula ou ponto e vírgula.
                    </span>
                    <strong>{separarBairros(zonaForm.bairrosTexto).length} bairro(s) identificado(s)</strong>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setZonaForm(null)
                    setZonaEditandoId(null)
                  }}
                >
                  Voltar
                </Button>
                <Button
                  disabled={
                    loading ||
                    !zonaForm.nome.trim() ||
                    !zonaForm.cidade.trim() ||
                    zonaForm.estado.length !== 2 ||
                    !separarBairros(zonaForm.bairrosTexto).length
                  }
                  onClick={salvarZona}
                >
                  {loading ? 'Salvando...' : zonaEditandoId ? 'Salvar alterações' : 'Criar zona'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Cadastre uma vez e vincule a mesma zona a diferentes núcleos.
                </p>
                <Button onClick={abrirNovaZona}>
                  <Plus className="mr-2 h-4 w-4" /> Nova zona
                </Button>
              </div>
              {zonas.length === 0 ? (
                <div className="rounded-lg border py-10 text-center text-muted-foreground">
                  Nenhuma zona prioritária cadastrada.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {zonas.map((zona) => (
                    <Card key={zona.id}>
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between gap-3 text-base">
                          <span>{zona.nome}</span>
                          <Badge variant="secondary">{zona.bairros.length} bairros</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          📍 {zona.cidade}/{zona.estado}
                        </p>
                        {(zona.ponto_entrada || zona.ponto_saida) && (
                          <p className="text-muted-foreground">
                            Referência: {zona.ponto_entrada || 'não informada'} →{' '}
                            {zona.ponto_saida || 'não informada'}
                          </p>
                        )}
                        <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                          {zona.bairros.map((bairro) => (
                            <Badge key={bairro} variant="outline">
                              {bairro}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 border-t pt-3">
                          <Button variant="outline" size="sm" onClick={() => abrirEdicaoZona(zona)}>
                            <Pencil className="mr-1.5 h-4 w-4" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setZonaExcluir(zona)}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setEditando(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? '🏠 Editar núcleo' : '🏠 Criar novo núcleo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>📁 Projeto *</Label>
              <Select
                value={form.projeto_id}
                onValueChange={(v) => set('projeto_id', v)}
                disabled={!!editando}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto..." />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {p.patrocinador}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editando && (
                <p className="text-xs text-muted-foreground">
                  O projeto do núcleo não muda: ele é a ligação das turmas e das inscrições já
                  registradas.
                </p>
              )}
            </div>
            {[
              ['nome', 'Nome do núcleo *'],
              ['capacidade', 'Capacidade'],
              ['telefone', 'Telefone'],
              ['cep', 'CEP'],
              ['endereco', 'Endereço'],
              ['bairro', 'Bairro do endereço'],
              ['cidade', 'Cidade'],
              ['estado', 'Estado'],
            ].map(([k, l]) => (
              <div key={k} className="space-y-2">
                <Label>{l}</Label>
                <Input
                  type={k === 'capacidade' ? 'number' : 'text'}
                  inputMode={k === 'cep' ? 'numeric' : undefined}
                  placeholder={k === 'cep' ? '00000-000' : undefined}
                  max={k === 'capacidade' ? vagasDisponiveis ?? undefined : undefined}
                  value={(form as any)[k]}
                  onChange={(e) =>
                    k === 'cep' ? preencherCep(e.target.value) : set(k, e.target.value)
                  }
                />
                {k === 'cep' && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {buscandoCep ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando endereço...
                      </>
                    ) : (
                      'Digite o CEP e o endereço, bairro, cidade e estado são preenchidos sozinhos.'
                    )}
                  </p>
                )}
                {k === 'capacidade' && vagasDisponiveis != null && (
                  <p
                    className={
                      Number(form.capacidade) > vagasDisponiveis
                        ? 'text-xs font-medium text-destructive'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    Restam {vagasDisponiveis} vagas no projeto selecionado.
                  </p>
                )}
              </div>
            ))}
            {editando && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground sm:col-span-2">
                As prioridades territoriais agora são organizadas em zonas. Abra este núcleo e use
                a aba <strong>Zonas</strong> para vincular uma zona global já cadastrada.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={loading || !form.projeto_id || !form.nome}>
              {loading
                ? 'Salvando...'
                : editando
                  ? '💾 Salvar alterações'
                  : 'Criar núcleo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!nucleoExcluir}
        onOpenChange={(o) => {
          if (!o) {
            setNucleoExcluir(null)
            setSenha('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir núcleo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold">
                Tem certeza que deseja excluir “{nucleoExcluir?.nome}”?
              </p>
              <p className="mt-1 text-muted-foreground">
                Esta ação é permanente. Núcleos com pessoas vinculadas serão protegidos pelo
                sistema.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Senha da Gestão Geral *</Label>
              <Input
                type="password"
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha para confirmar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && senha) confirmarExclusao()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNucleoExcluir(null)
                setSenha('')
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" disabled={loading || !senha} onClick={confirmarExclusao}>
              {loading ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!zonaExcluir} onOpenChange={(aberto) => !aberto && setZonaExcluir(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir zona prioritária</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Deseja excluir <strong>{zonaExcluir?.nome}</strong>?
            </p>
            <p className="text-muted-foreground">
              Se ela estiver vinculada a algum núcleo, o sistema pedirá que seja desvinculada antes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZonaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={loading} onClick={confirmarExclusaoZona}>
              {loading ? 'Excluindo...' : 'Excluir zona'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
