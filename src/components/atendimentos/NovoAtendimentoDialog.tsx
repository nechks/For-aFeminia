import { useState } from 'react'
import { useApp } from '@/store/app-context'
import {
  getAlunasPorTurma,
  criarAtendimento,
  type AlunaOpcao,
  type CriarAtendimentoData,
} from '@/services/atendimentos'
import { turmaLabels } from '@/lib/constants'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface NovoAtendimentoForm {
  turma: string
  aluna_id: string
  data_atendimento: string
  descricao: string
  encaminhamento: string
}

const formVazio = (): NovoAtendimentoForm => ({
  turma: '',
  aluna_id: '',
  data_atendimento: new Date().toISOString().split('T')[0],
  descricao: '',
  encaminhamento: '',
})

export function NovoAtendimentoDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const { user } = useApp()
  const [form, setForm] = useState<NovoAtendimentoForm>(formVazio())
  const [alunas, setAlunas] = useState<AlunaOpcao[]>([])
  const [loadingAlunas, setLoadingAlunas] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (field: keyof NovoAtendimentoForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleTurmaChange = async (turma: string) => {
    setForm((f) => ({ ...f, turma, aluna_id: '' }))
    setAlunas([])
    if (!turma) return
    setLoadingAlunas(true)
    try {
      const lista = await getAlunasPorTurma(turma)
      setAlunas(lista)
    } catch {
      toast({ title: 'Erro ao carregar alunas', variant: 'destructive' })
    } finally {
      setLoadingAlunas(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const data: CriarAtendimentoData = {
        aluna_id: form.aluna_id,
        turma: form.turma,
        data_atendimento: form.data_atendimento,
        descricao: form.descricao,
        encaminhamento: form.encaminhamento || undefined,
      }
      await criarAtendimento(user.id, data)
      toast({ title: 'Atendimento registrado!' })
      setForm(formVazio())
      setAlunas([])
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao registrar atendimento', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Atendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Núcleo (Turma)</label>
            <Select value={form.turma} onValueChange={handleTurmaChange} required>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Aluna</label>
            <Select
              value={form.aluna_id}
              onValueChange={(v) => set('aluna_id', v)}
              disabled={!form.turma || loadingAlunas}
              required
            >
              <SelectTrigger>
                {loadingAlunas ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                  </span>
                ) : (
                  <SelectValue
                    placeholder={
                      form.turma ? 'Selecione a aluna...' : 'Selecione o núcleo primeiro'
                    }
                  />
                )}
              </SelectTrigger>
              <SelectContent>
                {alunas.length === 0 && !loadingAlunas ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nenhuma aluna aprovada neste núcleo.
                  </div>
                ) : (
                  alunas.map((a) => (
                    <SelectItem key={a.userId} value={a.userId}>
                      {a.nomeCompleto}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data do Atendimento</label>
            <Input
              type="date"
              value={form.data_atendimento}
              onChange={(e) => set('data_atendimento', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              placeholder="Descreva o atendimento realizado..."
              className="min-h-[120px] resize-none"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Encaminhamento (opcional)</label>
            <Textarea
              placeholder="Próximos passos ou encaminhamentos..."
              className="min-h-[80px] resize-none"
              value={form.encaminhamento}
              onChange={(e) => set('encaminhamento', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.aluna_id}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
