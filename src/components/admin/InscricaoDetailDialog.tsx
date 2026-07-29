import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FichaInscricaoFF } from '@/lib/types'
import { getStatusInfo, turmaLabels } from '@/lib/constants'

interface Props {
  inscricao: FichaInscricaoFF | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  )
}

export function InscricaoDetailDialog({ inscricao, open, onOpenChange }: Props) {
  if (!inscricao) return null
  const status = getStatusInfo(inscricao.status)
  const created = inscricao.created ? new Date(inscricao.created).toLocaleString('pt-BR') : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Inscrição</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={status.color} variant="secondary">
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">Cadastro: {created}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome Completo" value={inscricao.nome_completo} />
            <Field label="CPF" value={inscricao.cpf} />
            <Field label="RG" value={inscricao.rg} />
            <Field label="Data de Nascimento" value={inscricao.data_nascimento} />
            <Field label="Telefone" value={inscricao.telefone} />
            <Field label="E-mail" value={inscricao.email} />
            <Field label="Turma" value={turmaLabels[inscricao.turma ?? ''] ?? inscricao.turma} />
            <Field label="CEP" value={inscricao.cep} />
            <Field label="Endereço" value={inscricao.endereco} />
            <Field label="Bairro" value={inscricao.bairro} />
            <Field label="Cidade" value={inscricao.cidade} />
            <Field label="Estado" value={inscricao.estado} />
            <Field label="Data da Primeira Aula" value={inscricao.data_primeira_aula} />
          </div>
          {inscricao.motivo_cancelamento && (
            <Field label="Motivo do Cancelamento" value={inscricao.motivo_cancelamento} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
