import { useEffect, useState } from 'react'
import { criarProjeto, getProjetos, type Projeto } from '@/services/projetos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarRange, Plus, Sparkles } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const vazio = { nome: '', patrocinador: '', capacidadeAlunas: '', dataInicio: '', dataTermino: '', descricao: '' }
const dataBR = (data: string) => data ? new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR') : '—'

export default function Projetos() {
  const [lista, setLista] = useState<Projeto[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(vazio)
  const [loading, setLoading] = useState(false)
  const load = () => getProjetos().then(setLista)
  useEffect(() => { load() }, [])
  const set = (campo: string, valor: string) => setForm((f) => ({ ...f, [campo]: valor }))
  const salvar = async () => {
    setLoading(true)
    try {
      await criarProjeto({ ...form, capacidadeAlunas: Number(form.capacidadeAlunas) })
      toast({ title: '✨ Projeto criado com sucesso!' })
      setOpen(false); setForm(vazio); load()
    } catch (e: any) {
      toast({ title: 'Erro ao criar projeto', description: e?.message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return <div className="mx-auto max-w-6xl space-y-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-bold">✨ Projetos</h1><p className="text-muted-foreground">Organize patrocinadores, vigência, núcleos e turmas.</p></div>
      <Button onClick={() => setOpen(true)} className="shadow-sm"><Plus className="mr-2 h-4 w-4" />Novo projeto</Button>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      {lista.map((p) => <Card key={p.id} className="overflow-hidden border-primary/15 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="h-2 bg-gradient-to-r from-primary via-violet-500 to-pink-500" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-2xl leading-tight">{p.nome}</CardTitle>
            <Badge className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">● Ativo</Badge>
          </div>
          {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">🤝 Patrocinador</p><p className="mt-1 font-semibold">{p.patrocinador}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">👩 Limite de participantes</p><p className="mt-1 font-semibold">{p.capacidadeAlunas} alunas</p></div>
          </div>
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarRange className="h-4 w-4 text-primary" />📅 Vigência do projeto</p>
            <div className="flex items-center justify-between gap-3 text-sm"><div><span className="text-xs text-muted-foreground">Início</span><p className="font-semibold">{dataBR(p.dataInicio)}</p></div><div className="h-px flex-1 bg-primary/25" /><div className="text-right"><span className="text-xs text-muted-foreground">Término</span><p className="font-semibold">{dataBR(p.dataTermino)}</p></div></div>
          </div>
        </CardContent>
      </Card>)}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" />Criar novo projeto</DialogTitle></DialogHeader>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2"><Label>🏷️ Nome do projeto *</Label><Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Força Feminina Federal" /></div>
        <div className="sm:col-span-2 space-y-2"><Label>🤝 Patrocinador *</Label><Input value={form.patrocinador} onChange={(e) => set('patrocinador', e.target.value)} placeholder="Nome da instituição patrocinadora" /></div>
        <div className="sm:col-span-2 space-y-2"><Label>👩 Quantidade máxima de alunas *</Label><Input type="number" min="1" value={form.capacidadeAlunas} onChange={(e) => set('capacidadeAlunas', e.target.value)} /></div>
        <div className="sm:col-span-2 rounded-xl border bg-muted/30 p-4"><p className="mb-4 flex items-center gap-2 font-medium"><CalendarRange className="h-4 w-4 text-primary" />📅 Vigência</p><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data de início *</Label><Input type="date" value={form.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} /></div><div className="space-y-2"><Label>Data de término *</Label><Input type="date" min={form.dataInicio} value={form.dataTermino} onChange={(e) => set('dataTermino', e.target.value)} /></div></div></div>
        <div className="sm:col-span-2 space-y-2"><Label>📝 Descrição</Label><Textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Informações adicionais sobre o projeto" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={loading || !form.nome || !form.patrocinador || !form.capacidadeAlunas || !form.dataInicio || !form.dataTermino} onClick={salvar}>{loading ? 'Criando...' : '✨ Criar projeto'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>
}
