import { useEffect, useMemo, useState } from 'react'
import {
  criarProjeto,
  editarProjeto,
  getProfissionaisDoProjeto,
  getProjetos,
  getStatusProjetoInfo,
  type Projeto,
  type StatusProjeto,
} from '@/services/projetos'
import api from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useApp } from '@/store/app-context'
import type { Usuario } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { MultiSelect } from '@/components/ui/multi-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { CalendarRange, Pencil, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import RenovarCicloDialog from '@/components/gestao/RenovarCicloDialog'

const vazio = {
  nome: '',
  patrocinador: '',
  capacidadeAlunas: '',
  dataInicio: '',
  dataTermino: '',
  descricao: '',
  status: 'ATIVO' as StatusProjeto,
  espaco_kids: false,
}

const dataBR = (data: string) =>
  data ? new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR') : '—'

const statusOpcoes: { value: StatusProjeto; label: string }[] = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'EM_ESPERA', label: 'Em espera' },
  { value: 'FINALIZADO', label: 'Finalizado' },
]

/** Abas do filtro. Separar por status evita a lista misturada, que fica confusa de ler. */
const abasStatus: { value: string; label: string }[] = [
  { value: 'ATIVO', label: '● Ativos' },
  { value: 'EM_ESPERA', label: '● Em espera' },
  { value: 'FINALIZADO', label: '● Finalizados' },
  { value: 'ALL', label: 'Todos' },
]

export default function Projetos() {
  const { user } = useApp()
  const podeGerenciar = user?.perfil === 'GESTAO_GERAL'
  const [lista, setLista] = useState<Projeto[]>([])
  const [profissionais, setProfissionais] = useState<Usuario[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>('ATIVO')
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Projeto | null>(null)
  const [form, setForm] = useState(vazio)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [renovar, setRenovar] = useState<Projeto | null>(null)

  const load = (status = filtroStatus) => getProjetos(status).then(setLista)

  useEffect(() => {
    load().catch((e) =>
      toast({
        title: 'Erro ao carregar projetos',
        description: getErrorMessage(e),
        variant: 'destructive',
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus])

  useEffect(() => {
    api
      .get<Usuario[]>('/api/users?perfil=PROFESSOR,ASSISTENTE_SOCIAL,ADMINISTRATIVO')
      .then(setProfissionais)
      .catch(() => setProfissionais([]))
  }, [])

  const opcoesProfissionais = useMemo(
    () =>
      profissionais.map((p) => ({
        value: p.id,
        label: p.nomeSocial?.trim() || p.name,
        hint: p.email,
      })),
    [profissionais],
  )

  const set = (campo: string, valor: string | boolean) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  const abrirNovo = () => {
    setEditando(null)
    setForm(vazio)
    setSelecionados([])
    setOpen(true)
  }

  const abrirEdicao = async (projeto: Projeto) => {
    setEditando(projeto)
    setForm({
      nome: projeto.nome,
      patrocinador: projeto.patrocinador,
      capacidadeAlunas: String(projeto.capacidadeAlunas ?? ''),
      dataInicio: projeto.dataInicio ?? '',
      dataTermino: projeto.dataTermino ?? '',
      descricao: projeto.descricao ?? '',
      status: projeto.status ?? 'ATIVO',
      espaco_kids: projeto.espaco_kids ?? false,
    })
    setSelecionados([])
    setOpen(true)
    try {
      const vinculados = await getProfissionaisDoProjeto(projeto.id)
      setSelecionados(vinculados.map((v) => v.user_id))
    } catch {
      // Sem os vínculos carregados, salvar sem mexer na seleção esvaziaria a lista.
      toast({
        title: 'Não foi possível carregar os profissionais do projeto',
        description: 'Reabra a edição antes de salvar para não desfazer os vínculos atuais.',
        variant: 'destructive',
      })
      setOpen(false)
    }
  }

  const salvar = async () => {
    setLoading(true)
    const payload = {
      nome: form.nome,
      patrocinador: form.patrocinador,
      capacidadeAlunas: Number(form.capacidadeAlunas),
      dataInicio: form.dataInicio,
      dataTermino: form.dataTermino,
      descricao: form.descricao,
      status: form.status,
      espaco_kids: form.espaco_kids,
      profissionais_ids: selecionados,
    }
    try {
      if (editando) {
        await editarProjeto(editando.id, payload)
        toast({
          title: '✅ Projeto atualizado!',
          description:
            form.status === 'FINALIZADO' && editando.status !== 'FINALIZADO'
              ? 'O acesso das alunas vinculadas foi encerrado. Use Renovar ciclo para reabrir.'
              : undefined,
        })
      } else {
        await criarProjeto(payload)
        toast({ title: '✨ Projeto criado com sucesso!' })
      }
      setOpen(false)
      setEditando(null)
      setForm(vazio)
      setSelecionados([])
      load()
    } catch (e) {
      toast({
        title: editando ? 'Erro ao atualizar projeto' : 'Erro ao criar projeto',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formInvalido =
    !form.nome ||
    !form.patrocinador ||
    !form.capacidadeAlunas ||
    !form.dataInicio ||
    !form.dataTermino

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">✨ Projetos</h1>
          <p className="text-muted-foreground">
            Organize patrocinadores, vigência, núcleos, turmas e equipe.
          </p>
        </div>
        {podeGerenciar && (
          <Button onClick={abrirNovo} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo projeto
          </Button>
        )}
      </div>

      <Tabs value={filtroStatus} onValueChange={setFiltroStatus}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {abasStatus.map((aba) => (
            <TabsTrigger key={aba.value} value={aba.value}>
              {aba.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {lista.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Nenhum projeto{filtroStatus === 'ALL' ? '' : ' nesta situação'}.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {lista.map((p) => {
          const status = getStatusProjetoInfo(p.status ?? (p.ativo ? 'ATIVO' : 'FINALIZADO'))
          return (
            <Card
              key={p.id}
              className="overflow-hidden border-primary/15 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-2 bg-marca" />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg leading-tight">{p.nome}</CardTitle>
                  <Badge className={`shrink-0 ${status.color}`}>● {status.label}</Badge>
                </div>
                {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      🤝 Patrocinador
                    </p>
                    <p className="mt-1 font-semibold">{p.patrocinador}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      👩 Limite de participantes
                    </p>
                    <p className="mt-1 font-semibold">{p.capacidadeAlunas} alunas</p>
                  </div>
                </div>
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <CalendarRange className="h-4 w-4 text-primary" />📅 Vigência do projeto
                  </p>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Início</span>
                      <p className="font-semibold">{dataBR(p.dataInicio)}</p>
                    </div>
                    <div className="h-px flex-1 bg-primary/25" />
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Término</span>
                      <p className="font-semibold">{dataBR(p.dataTermino)}</p>
                    </div>
                  </div>
                </div>
                {p.atualizadoPorNome && (
                  <p className="text-xs text-muted-foreground">
                    Última alteração por {p.atualizadoPorNome}
                    {p.atualizadoEm
                      ? ` em ${new Date(p.atualizadoEm).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                )}
                {podeGerenciar && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(p)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    {p.status === 'FINALIZADO' && (
                      <Button variant="outline" size="sm" onClick={() => setRenovar(p)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Renovar ciclo
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setEditando(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              {editando ? 'Editar projeto' : 'Criar novo projeto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>🏷️ Nome do projeto *</Label>
              <Input
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex.: Força Feminina Federal"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>🤝 Patrocinador *</Label>
              <Input
                value={form.patrocinador}
                onChange={(e) => set('patrocinador', e.target.value)}
                placeholder="Nome da instituição patrocinadora"
              />
            </div>
            <div className="space-y-2">
              <Label>👩 Quantidade máxima de alunas *</Label>
              <Input
                type="number"
                min="1"
                value={form.capacidadeAlunas}
                onChange={(e) => set('capacidadeAlunas', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>📌 Status *</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOpcoes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.status === 'FINALIZADO' && editando?.status !== 'FINALIZADO' && (
                <p className="text-xs text-amber-700">
                  ⚠️ Ao finalizar, as alunas vinculadas perdem o acesso. O histórico é preservado e
                  você pode reabrir pelo botão Renovar ciclo.
                </p>
              )}
            </div>
            <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
              <p className="mb-4 flex items-center gap-2 font-medium">
                <CalendarRange className="h-4 w-4 text-primary" />📅 Vigência
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data de início *</Label>
                  <Input
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => set('dataInicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de término *</Label>
                  <Input
                    type="date"
                    min={form.dataInicio}
                    value={form.dataTermino}
                    onChange={(e) => set('dataTermino', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>👥 Profissionais do projeto</Label>
              <MultiSelect
                options={opcoesProfissionais}
                value={selecionados}
                onChange={setSelecionados}
                placeholder="Selecione os profissionais..."
                searchPlaceholder="Buscar por nome ou e-mail..."
                emptyMessage="Nenhum profissional cadastrado."
              />
              <p className="text-xs text-muted-foreground">
                A mesma pessoa pode atuar em vários projetos ao mesmo tempo. O papel dela em cada
                turma continua sendo definido na tela do núcleo.
              </p>
            </div>
            <div className="sm:col-span-2 rounded-xl border bg-muted/30 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={form.espaco_kids}
                  onCheckedChange={(marcado) => set('espaco_kids', marcado === true)}
                  className="mt-0.5"
                />
                <span className="space-y-1">
                  <span className="block font-medium">🧸 Este projeto tem Espaço Kids</span>
                  <span className="block text-sm text-muted-foreground">
                    Marque apenas se houver estrutura para receber as crianças. Só as candidatas
                    que escolherem um núcleo deste projeto verão a pergunta sobre a vaga.
                  </span>
                </span>
              </label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>📝 Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
                placeholder="Informações adicionais sobre o projeto"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={loading || formInvalido} onClick={salvar}>
              {loading ? 'Salvando...' : editando ? '💾 Salvar alterações' : '✨ Criar projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RenovarCicloDialog projeto={renovar} onClose={() => setRenovar(null)} />
    </div>
  )
}
