import { useEffect, useState } from 'react'
import { ClipboardList, Loader2, Plus, Search } from 'lucide-react'
import {
  criarRegistroHistorico,
  getHistoricoProfissional,
  getProfissionaisHistorico,
  type HistoricoProfissional,
  type ProfissionalResumo,
  type TipoHistorico,
} from '@/services/historico-profissional'
import { fileUrl } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import HistoricoProfissionalView from '@/components/profissional/HistoricoProfissionalView'
import { useToast } from '@/hooks/use-toast'

const tipos: Array<[TipoHistorico, string]> = [
  ['AVALIACAO_POSITIVA', 'Avaliação positiva'],
  ['AVALIACAO_NEGATIVA', 'Avaliação negativa'],
  ['CONVERSA', 'Conversa'],
  ['ADVERTENCIA', 'Advertência'],
  ['OBSERVACAO', 'Observação'],
]

const hoje = () => new Date().toISOString().slice(0, 10)

export default function HistoricoProfissionais() {
  const { toast } = useToast()
  const [profissionais, setProfissionais] = useState<ProfissionalResumo[]>([])
  const [selecionado, setSelecionado] = useState('')
  const [historico, setHistorico] = useState<HistoricoProfissional | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [tipo, setTipo] = useState<TipoHistorico>('AVALIACAO_POSITIVA')
  const [data, setData] = useState(hoje())
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [visivel, setVisivel] = useState(true)

  useEffect(() => {
    getProfissionaisHistorico()
      .then((lista) => {
        setProfissionais(lista)
        if (lista.length) setSelecionado(lista[0].id)
      })
      .catch((err) => toast({ title: 'Erro ao carregar profissionais', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    if (!selecionado) return
    setLoadingDetalhe(true)
    getHistoricoProfissional(selecionado)
      .then(setHistorico)
      .catch((err) => toast({ title: 'Erro ao carregar histórico', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoadingDetalhe(false))
  }, [selecionado, toast])

  async function registrar(event: React.FormEvent) {
    event.preventDefault()
    if (!selecionado) return
    setSalvando(true)
    try {
      const criado = await criarRegistroHistorico(selecionado, {
        tipo,
        data_registro: data,
        titulo,
        descricao,
        visivel_profissional: visivel,
      })
      setHistorico((atual) => atual ? { ...atual, registros: [criado, ...atual.registros] } : atual)
      setProfissionais((atuais) => atuais.map((p) => p.id === selecionado && tipo === 'ADVERTENCIA' ? { ...p, advertencias: (p.advertencias ?? 0) + 1 } : p))
      setTitulo('')
      setDescricao('')
      setDialogOpen(false)
      toast({ title: 'Registro adicionado ao histórico!' })
    } catch (err) {
      toast({ title: 'Não foi possível registrar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const filtrados = profissionais.filter((p) => `${p.nome} ${p.nome_social ?? ''} ${p.email}`.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardList className="h-6 w-6" />Histórico dos profissionais</h1><p className="text-sm text-muted-foreground">Acompanhe atuações, assiduidade, avaliações, conversas e advertências.</p></div>
        {selecionado && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Adicionar registro</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Registrar avaliação ou ocorrência</DialogTitle></DialogHeader>
              <form onSubmit={registrar} className="space-y-4">
                <div className="space-y-1.5"><Label>Tipo *</Label><Select value={tipo} onValueChange={(v) => setTipo(v as TipoHistorico)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{tipos.map(([valor, label]) => <SelectItem key={valor} value={valor}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Data *</Label><Input type="date" max={hoje()} value={data} onChange={(e) => setData(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Título *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Resumo do registro" required maxLength={160} /></div>
                <div className="space-y-1.5"><Label>Descrição *</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a avaliação, conversa, orientação ou ocorrência..." className="min-h-32" required /></div>
                <div className="flex items-start gap-3 rounded-md border p-3"><Checkbox id="visivel" checked={visivel} onCheckedChange={(v) => setVisivel(v === true)} /><div><Label htmlFor="visivel">Visível para o profissional</Label><p className="text-xs text-muted-foreground">Desmarque para manter como observação interna da Gestão Geral.</p></div></div>
                <Button type="submit" disabled={salvando} className="w-full">{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Adicionar ao histórico'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="h-fit"><CardHeader><CardTitle className="text-base">Profissionais</CardTitle><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="pl-9" /></div></CardHeader><CardContent className="max-h-[65vh] space-y-2 overflow-y-auto">
            {filtrados.map((p) => { const nome = p.nome_social || p.nome; return <button key={p.id} onClick={() => setSelecionado(p.id)} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition ${selecionado === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}><Avatar className="h-10 w-10">{p.avatar && <AvatarImage src={fileUrl(p.avatar)} />}<AvatarFallback>{nome.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{nome}</p><p className="truncate text-xs text-muted-foreground">{p.email}</p></div>{Boolean(p.advertencias) && <Badge variant="destructive">{p.advertencias}</Badge>}</button> })}
            {!filtrados.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum profissional encontrado.</p>}
          </CardContent></Card>
          <div>{loadingDetalhe ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : historico ? <HistoricoProfissionalView historico={historico} gestao /> : <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um profissional.</CardContent></Card>}</div>
        </div>
      )}
    </div>
  )
}
