import { useEffect, useMemo, useState } from 'react'
import { criarNucleo, excluirNucleo, getNucleos, type Nucleo } from '@/services/nucleos'
import { getProjetos, type Projeto } from '@/services/projetos'
import { criarTurma, getTurmas, type Turma } from '@/services/turmas'
import api from '@/lib/api/client'
import type { Usuario } from '@/lib/types'
import { buscarCep, formatCep } from '@/lib/viacep'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Building2, Loader2, MapPin, Plus, Trash2, Users } from 'lucide-react'
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
const turmaVazia = { nome: '', capacidade: '', dias_semana: '', turno: '' }
const dias = [
  ['MONDAY', 'Segunda'],
  ['TUESDAY', 'Terça'],
  ['WEDNESDAY', 'Quarta'],
  ['THURSDAY', 'Quinta'],
  ['FRIDAY', 'Sexta'],
  ['SATURDAY', 'Sábado'],
  ['SUNDAY', 'Domingo'],
] as const
const turnoLabel: Record<string, string> = {
  MANHA: '🌅 Manhã',
  TARDE: '☀️ Tarde',
  NOITE: '🌙 Noite',
}
const tipoProfissionalLabel: Record<string, string> = {
  PROFESSORA_DEFESA_PESSOAL: 'Professora de Defesa Pessoal',
  AUXILIAR_DEFESA_PESSOAL: 'Auxiliar de Defesa Pessoal',
  ASSISTENTE_SOCIAL: 'Assistente Social',
  MEDIADORA_RODA_CONVERSA: 'Mediadora de Roda de Conversa',
  MONITOR_CRIANCA: 'Monitor de Criança',
}
export default function Nucleos() {
  const [lista, setLista] = useState<Nucleo[]>([]),
    [projetos, setProjetos] = useState<Projeto[]>([]),
    [open, setOpen] = useState(false),
    [form, setForm] = useState(vazio),
    [loading, setLoading] = useState(false),
    [buscandoCep, setBuscandoCep] = useState(false),
    [nucleoExcluir, setNucleoExcluir] = useState<Nucleo | null>(null),
    [senha, setSenha] = useState('')
  const [turmas, setTurmas] = useState<Record<string, Turma[]>>({}),
    [equipe, setEquipe] = useState<Usuario[]>([]),
    [nucleoTurma, setNucleoTurma] = useState<Nucleo | null>(null),
    [formTurma, setFormTurma] = useState(turmaVazia)
  const load = async () => {
    const [n, p, membros] = await Promise.all([
      getNucleos(),
      getProjetos(),
      api.get<Usuario[]>('/api/users?perfil=PROFESSOR'),
    ])
    setLista(n)
    setProjetos(p.filter((x) => x.ativo))
    setEquipe(membros)
    const pares = await Promise.all(
      n.map(async (nucleo) => [nucleo.id, await getTurmas(nucleo.id)] as const),
    )
    setTurmas(Object.fromEntries(pares))
  }
  useEffect(() => {
    load().catch(() => toast({ title: 'Erro ao carregar dados', variant: 'destructive' }))
  }, [])
  const projetosPorId = useMemo(
    () => Object.fromEntries(projetos.map((p) => [p.id, p])),
    [projetos],
  )
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const alternarDia = (dia: string, marcado: boolean) =>
    setFormTurma((f) => {
      const atuais = f.dias_semana ? f.dias_semana.split(',') : []
      const novos = marcado ? [...new Set([...atuais, dia])] : atuais.filter((d) => d !== dia)
      return { ...f, dias_semana: novos.join(',') }
    })
  const salvarTurma = async () => {
    if (!nucleoTurma) return
    setLoading(true)
    try {
      await criarTurma({
        ...formTurma,
        nucleo_id: nucleoTurma.id,
        capacidade: Number(formTurma.capacidade) || undefined,
      })
      toast({ title: '🎓 Turma criada!' })
      setNucleoTurma(null)
      setFormTurma(turmaVazia)
      load()
    } catch (e: any) {
      toast({ title: 'Erro ao criar turma', description: e?.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
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
    } catch (e: any) {
      toast({ title: 'Erro ao criar núcleo', description: e?.message, variant: 'destructive' })
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
    } catch (e: any) {
      toast({ title: 'Não foi possível excluir', description: e?.message, variant: 'destructive' })
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
            Cada núcleo pertence a um projeto. Dias e horários serão definidos nas turmas.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!projetos.length}>
          <Plus className="mr-2 h-4 w-4" />
          Novo núcleo
        </Button>
      </div>
      {!projetos.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠️ Crie um projeto antes de cadastrar o primeiro núcleo.
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {lista.map((n) => (
          <Card key={n.id} className="overflow-hidden shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    📁 {projetosPorId[n.projeto_id ?? '']?.nome ?? 'Projeto não associado'}
                  </p>
                  <CardTitle className="mt-2 flex gap-2">
                    <Building2 className="h-5 w-5" />
                    {n.nome}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setNucleoExcluir(n)}
                  title="Excluir núcleo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex gap-2">
                <MapPin className="h-4 w-4" />
                {[n.endereco, n.bairro, n.cidade, n.estado].filter(Boolean).join(', ') ||
                  'Endereço não informado'}
              </p>
              <p className="flex gap-2">
                <Users className="h-4 w-4" />
                Capacidade do núcleo: {n.capacidade ?? 'não informada'}
              </p>
              <p>👤 Responsável: {n.responsavel || 'não informado'}</p>
              <div className="mt-3 space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">🎓 Turmas</p>
                  <Button size="sm" variant="outline" onClick={() => setNucleoTurma(n)}>
                    Adicionar turma
                  </Button>
                </div>
                {(turmas[n.id] ?? []).length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma turma cadastrada.</p>
                ) : (
                  (turmas[n.id] ?? []).map((t) => (
                    <div key={t.id} className="rounded-md bg-muted/50 p-2">
                      <p className="font-medium">
                        {t.nome} · {turnoLabel[t.turno]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.dias_semana
                          .split(',')
                          .map((d) => dias.find(([v]) => v === d)?.[1] ?? d)
                          .join(', ')}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="font-semibold">👥 Equipe</p>
                {equipe.filter((m) => m.nucleo_id === n.id).length === 0 ? (
                  <p className="text-muted-foreground">Nenhum membro associado.</p>
                ) : (
                  equipe
                    .filter((m) => m.nucleo_id === n.id)
                    .map((m) => (
                      <div key={m.id} className="rounded-md border bg-background p-2">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tipoProfissionalLabel[m.tipo_profissional ?? ''] ?? 'Equipe'}
                          {m.turma_id
                            ? ` · ${turmas[n.id]?.find((t) => t.id === m.turma_id)?.nome ?? 'Turma'}`
                            : ''}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>🏠 Criar novo núcleo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
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
        open={!!nucleoTurma}
        onOpenChange={(o) => {
          if (!o) {
            setNucleoTurma(null)
            setFormTurma(turmaVazia)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>🎓 Nova turma em {nucleoTurma?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da turma *</Label>
              <Input
                value={formTurma.nome}
                onChange={(e) => setFormTurma((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Turma manhã"
              />
            </div>
            <div className="space-y-2">
              <Label>Capacidade</Label>
              <Input
                type="number"
                min="1"
                value={formTurma.capacidade}
                onChange={(e) => setFormTurma((f) => ({ ...f, capacidade: e.target.value }))}
              />
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <Label>📅 Dias de aula *</Label>
              <div className="flex flex-wrap gap-4">
                {dias.map(([valor, label]) => (
                  <label key={valor} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={formTurma.dias_semana.split(',').includes(valor)}
                      onCheckedChange={(v) => alternarDia(valor, v === true)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>🕐 Período *</Label>
              <Select
                value={formTurma.turno}
                onValueChange={(v) => setFormTurma((f) => ({ ...f, turno: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANHA">🌅 Manhã</SelectItem>
                  <SelectItem value="TARDE">☀️ Tarde</SelectItem>
                  <SelectItem value="NOITE">🌙 Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNucleoTurma(null)
                setFormTurma(turmaVazia)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarTurma}
              disabled={loading || !formTurma.nome || !formTurma.dias_semana || !formTurma.turno}
            >
              {loading ? 'Criando...' : 'Criar turma'}
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
