import { useEffect, useMemo, useState } from 'react'
import {
  getAlunasDoProjeto,
  renovarCiclo,
  type AlunaDoProjeto,
  type Projeto,
} from '@/services/projetos'
import { getErrorMessage } from '@/lib/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const renovacaoInfo: Record<string, { label: string; color: string }> = {
  NAO_ENVIADA: { label: 'Não enviada', color: 'bg-slate-200 text-slate-700 hover:bg-slate-200' },
  ENVIADA: { label: 'Enviada', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  RESPONDIDA: { label: 'Respondida', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
}

/**
 * Reabre o projeto para as alunas escolhidas. Enviar dispara uma nova ficha de confirmação para
 * cada uma; o acesso só volta quando ela responde, então a coluna de situação é o que a gestão
 * acompanha depois do envio.
 */
export default function RenovarCicloDialog({
  projeto,
  onClose,
}: {
  projeto: Projeto | null
  onClose: () => void
}) {
  const [alunas, setAlunas] = useState<AlunaDoProjeto[]>([])
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!projeto) return
    setCarregando(true)
    setSelecionadas([])
    setBusca('')
    getAlunasDoProjeto(projeto.id)
      .then(setAlunas)
      .catch((e) =>
        toast({
          title: 'Erro ao carregar as alunas do projeto',
          description: getErrorMessage(e),
          variant: 'destructive',
        }),
      )
      .finally(() => setCarregando(false))
  }, [projeto])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return alunas
    return alunas.filter((a) => a.nome_completo.toLowerCase().includes(termo))
  }, [alunas, busca])

  const alternar = (userId: string) =>
    setSelecionadas((atual) =>
      atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId],
    )

  const todasVisiveisMarcadas =
    filtradas.length > 0 && filtradas.every((a) => selecionadas.includes(a.user_id))

  const alternarTodas = () =>
    setSelecionadas(
      todasVisiveisMarcadas
        ? selecionadas.filter((id) => !filtradas.some((a) => a.user_id === id))
        : [...new Set([...selecionadas, ...filtradas.map((a) => a.user_id)])],
    )

  const enviar = async () => {
    if (!projeto || !selecionadas.length) return
    setEnviando(true)
    try {
      const resultado = await renovarCiclo(projeto.id, selecionadas)
      toast({
        title: `🔄 Ficha enviada para ${resultado.renovadas} aluna(s).`,
        description: 'O acesso de cada uma volta quando ela responder a nova ficha.',
      })
      setAlunas(await getAlunasDoProjeto(projeto.id))
      setSelecionadas([])
    } catch (e) {
      toast({
        title: 'Não foi possível renovar o ciclo',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={!!projeto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renovar ciclo — {projeto?.nome}
          </DialogTitle>
          <DialogDescription>
            Selecione quem continua no próximo ciclo. Cada aluna selecionada recebe uma nova ficha
            de confirmação e volta a ter acesso somente depois de respondê-la.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Buscar aluna pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando alunas...
            </div>
          ) : filtradas.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Nenhuma aluna vinculada a este projeto.
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={todasVisiveisMarcadas} onCheckedChange={alternarTodas} />
                Selecionar todas ({filtradas.length})
              </label>
              <div className="divide-y rounded-lg border">
                {filtradas.map((aluna) => {
                  const info = renovacaoInfo[aluna.renovacao_status] ?? renovacaoInfo.NAO_ENVIADA
                  return (
                    <label
                      key={aluna.user_id}
                      className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selecionadas.includes(aluna.user_id)}
                        onCheckedChange={() => alternar(aluna.user_id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{aluna.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {aluna.nucleo_codigo ?? '—'} ·{' '}
                          {aluna.acesso_ativo ? 'com acesso' : 'sem acesso'}
                        </p>
                      </div>
                      <Badge className={`shrink-0 ${info.color}`}>{info.label}</Badge>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button disabled={enviando || !selecionadas.length} onClick={enviar}>
            {enviando ? 'Enviando...' : `Enviar ficha para ${selecionadas.length} aluna(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
