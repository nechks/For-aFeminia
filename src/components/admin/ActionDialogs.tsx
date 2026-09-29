import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ApprovalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (date: string) => void
}

export function ApprovalDialog({ open, onOpenChange, onConfirm }: ApprovalProps) {
  const [date, setDate] = useState('')

  useEffect(() => {
    if (open) setDate('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar Inscrição</DialogTitle>
          <DialogDescription>
            Aprovar libera o preenchimento da ficha de confirmação. A data da primeira aula é
            opcional aqui — o normal é defini-la depois que a aluna enviar a ficha, na tela
            &ldquo;Fichas aguardando a 1ª aula&rdquo;, que é o momento em que ela recebe o aviso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="data_primeira_aula">Data da Primeira Aula (opcional)</Label>
          <Input
            id="data_primeira_aula"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button onClick={() => onConfirm(date)}>Confirmar Aprovação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CancellationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (motivo: string) => void
}

export function CancellationDialog({ open, onOpenChange, onConfirm }: CancellationProps) {
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (open) setMotivo('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Inscrição</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento. Este campo é obrigatório.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="motivo">Motivo do Cancelamento</Label>
          <Textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={!motivo.trim()}
            onClick={() => onConfirm(motivo.trim())}
          >
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
