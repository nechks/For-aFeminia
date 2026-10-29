import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { exportarEvidencias, type TipoRegistroAula } from '@/services/registros-aula'
import { type MinhaTurma } from '@/services/turmas'
import { getErrorMessage } from '@/lib/api/errors'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

const TODAS = 'TODAS'

/**
 * Exporta o documento de evidências. Word e PDF saem com o mesmo layout — cabeçalho da aula, lista
 * de presentes e as fotos embutidas —, então a escolha é só do formato que a coordenação precisa
 * entregar.
 */
export default function ExportarEvidencias({
  tipo,
  turmas,
}: {
  tipo: TipoRegistroAula
  turmas: MinhaTurma[]
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [turmaId, setTurmaId] = useState(TODAS)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [baixando, setBaixando] = useState<'docx' | 'pdf' | null>(null)

  const baixar = async (formato: 'docx' | 'pdf') => {
    setBaixando(formato)
    try {
      const nome = await exportarEvidencias({
        formato,
        tipo,
        turma_id: turmaId === TODAS ? undefined : turmaId,
        de: de || undefined,
        ate: ate || undefined,
      })
      toast({ title: '📄 Documento gerado!', description: nome })
      setOpen(false)
    } catch (err) {
      toast({
        title: 'Não foi possível exportar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBaixando(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!turmas.length}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar evidências</DialogTitle>
          <DialogDescription>
            O documento traz projeto, núcleo, turma, profissional e data de cada aula, o conteúdo
            registrado, a lista de presentes e as fotos anexadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas as minhas turmas</SelectItem>
                {turmas.map((vinculo) => (
                  <SelectItem key={vinculo.turma.id} value={vinculo.turma.id}>
                    {vinculo.turma.nome} · {vinculo.nucleo_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-de">De</Label>
              <Input
                id="export-de"
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-ate">Até</Label>
              <Input
                id="export-ate"
                type="date"
                min={de || undefined}
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Sem datas, o documento traz todo o período registrado.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button className="flex-1" disabled={!!baixando} onClick={() => baixar('docx')}>
            {baixando === 'docx' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Word (.docx)
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!!baixando}
            onClick={() => baixar('pdf')}
          >
            {baixando === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
