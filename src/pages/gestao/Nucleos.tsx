import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  criarNucleo,
  excluirNucleo,
  getNucleos,
  getNucleosResumo,
  type Nucleo,
  type NucleoResumo,
} from '@/services/nucleos'
import { getProjetos, type Projeto } from '@/services/projetos'
import { getErrorMessage } from '@/lib/api/errors'
import { useApp } from '@/store/app-context'
import { buscarCep, formatCep } from '@/lib/viacep'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Building2, ChevronRight, Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
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
  email: '',
  responsavel: '',
  capacidade: '',
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
  const [lista, setLista] = useState<Nucleo[]>([])
  const [resumo, setResumo] = useState<NucleoResumo[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(vazio)
  const [loading, setLoading] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [nucleoExcluir, setNucleoExcluir] = useState<Nucleo | null>(null)
  const [senha, setSenha] = useState('')

  const load = async () => {
    const [n, p, r] = await Promise.all([getNucleos(), getProjetos(), getNucleosResumo()])
    setLista(n)
    setProjetos(p.filter((x) => x.ativo))
    setResumo(r)
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

  const salvar = async () => {
    setLoading(true)
    try {
      await criarNucleo({ ...form, capacidade: Number(form.capacidade) || undefined })
      toast({ title: '🏠 Núcleo criado!' })
      setOpen(false)
      setForm(vazio)
      load()
    } catch (e) {
      toast({ title: 'Erro ao criar núcleo', description: getErrorMessage(e), variant: 'destructive' })
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

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🏠 Núcleos</h1>
          <p className="text-muted-foreground">
            Abra um núcleo para gerenciar turmas, equipe e alunas.
          </p>
        </div>
        {podeGerenciar && (
          <Button onClick={() => setOpen(true)} disabled={!projetos.length}>
            <Plus className="mr-2 h-4 w-4" />
            Novo núcleo
          </Button>
        )}
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
              <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
              <CardHeader className="pb-3">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNucleoExcluir(n)
                      }}
                      title="Excluir núcleo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>🏠 Criar novo núcleo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>📁 Projeto *</Label>
              <Select value={form.projeto_id} onValueChange={(v) => set('projeto_id', v)}>
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
            </div>
            {[
              ['nome', 'Nome do núcleo *'],
              ['responsavel', 'Responsável'],
              ['capacidade', 'Capacidade'],
              ['telefone', 'Telefone'],
              ['email', 'E-mail'],
              ['cep', 'CEP'],
              ['endereco', 'Endereço'],
              ['bairro', 'Bairro'],
              ['cidade', 'Cidade'],
              ['estado', 'Estado'],
            ].map(([k, l]) => (
              <div key={k} className="space-y-2">
                <Label>{l}</Label>
                <Input
                  type={k === 'capacidade' ? 'number' : 'text'}
                  value={(form as any)[k]}
                  onChange={(e) =>
                    k === 'cep' ? preencherCep(e.target.value) : set(k, e.target.value)
                  }
                />
                {k === 'cep' && buscandoCep && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando endereço...
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={loading || !form.projeto_id || !form.nome}>
              {loading ? 'Criando...' : 'Criar núcleo'}
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
    </div>
  )
}
