import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getPresencasTurma,
  registrarPresencas,
  type PresencaAluno,
  type RegistroPresenca,
} from '@/services/presenca'
import { getErrorMessage } from '@/lib/api/errors'
import { tipoChamadaLabel, type TipoChamada } from '@/lib/turmas'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Save, Loader2, Check, X, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusChamada = 'PRESENCA' | 'FALTA' | 'JUSTIFICADO' | null

interface RegistroChamadaState {
  status: StatusChamada
  observacao: string
}

/**
 * Chamada de uma turma para um tipo específico (Defesa Pessoal ou Roda de Conversa). As duas são
 * independentes: registrar uma não interfere na outra, mesmo no mesmo dia de aula.
 */
export default function ChamadaTurma({
  turmaId,
  tipoChamada,
  somenteLeitura = false,
}: {
  turmaId: string
  tipoChamada: TipoChamada
  somenteLeitura?: boolean
}) {
  const [dataAula, setDataAula] = useState(new Date().toISOString().split('T')[0])
  const [alunos, setAlunos] = useState<PresencaAluno[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [chamadaState, setChamadaState] = useState<Record<string, RegistroChamadaState>>({})

  // Marcações feitas na tela e ainda não salvas. A atualização automática não pode apagá-las.
  const alteradoRef = useRef(false)

  /**
   * `silencioso` é a atualização automática: não troca a lista pelo "carregando" (era isso que
   * fazia a tela piscar a cada 10 s) e não mexe na chamada enquanto há marcações não salvas.
   */
  const loadData = useCallback(async (silencioso = false) => {
    if (!turmaId || !dataAula) return
    if (silencioso && alteradoRef.current) return
    if (!silencioso) setLoading(true)
    try {
      const result = await getPresencasTurma(turmaId, dataAula, tipoChamada)
      setAlunos(result.alunos)
      const state: Record<string, RegistroChamadaState> = {}
      result.alunos.forEach((a) => {
        state[a.user_id] = {
          status: !a.presenca
            ? null
            : a.presenca.presente
              ? 'PRESENCA'
              : a.presenca.justificada
                ? 'JUSTIFICADO'
                : 'FALTA',
          observacao: a.presenca?.justificativa ?? '',
        }
      })
      // Só regrava se mudou: a mesma chamada vinda de novo não redesenha a tabela.
      setChamadaState((atual) =>
        JSON.stringify(atual) === JSON.stringify(state) ? atual : state,
      )
      alteradoRef.current = false
    } catch (err) {
      console.error('Failed to load presencas:', err)
      if (!silencioso) {
        toast({
          title: 'Erro ao carregar lista de presença',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      }
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [turmaId, dataAula, tipoChamada])

  useEffect(() => {
    alteradoRef.current = false
    loadData()
  }, [loadData])

  useRealtime('presenca', () => {
    loadData(true)
  })

  const marcar = (userId: string, status: StatusChamada) => {
    alteradoRef.current = true
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { status, observacao: prev[userId]?.observacao ?? '' },
    }))
  }

  const handleObservacao = (userId: string, value: string) => {
    alteradoRef.current = true
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { status: prev[userId]?.status ?? null, observacao: value },
    }))
  }

  const handleSave = async () => {
    const pendentes = alunos.filter((a) => !chamadaState[a.user_id]?.status)
    if (pendentes.length > 0) {
      toast({
        title: 'Chamada incompleta',
        description: `Marque Presença, Falta ou Justificado para todas as alunas. Faltam ${pendentes.length}.`,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const registros: RegistroPresenca[] = alunos.map((a) => ({
        user_id: a.user_id,
        presente: chamadaState[a.user_id]?.status === 'PRESENCA',
        justificada: chamadaState[a.user_id]?.status === 'JUSTIFICADO',
        justificativa: chamadaState[a.user_id]?.observacao.trim() ?? '',
      }))
      await registrarPresencas(turmaId, dataAula, tipoChamada, registros)
      toast({
        title: 'Chamada salva!',
        description: `${tipoChamadaLabel(tipoChamada)} — ${new Date(
          `${dataAula}T00:00:00`,
        ).toLocaleDateString('pt-BR')}`,
      })
      loadData()
    } catch (err) {
      console.error('Failed to save presencas:', err)
      toast({
        title: 'Erro ao salvar chamada',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const presentesCount = Object.values(chamadaState).filter((s) => s.status === 'PRESENCA').length
  const faltasCount = Object.values(chamadaState).filter((s) => s.status === 'FALTA').length
  const justificadosCount = Object.values(chamadaState).filter(
    (s) => s.status === 'JUSTIFICADO',
  ).length
  const pendentesCount = alunos.length - presentesCount - faltasCount - justificadosCount

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Total: <strong>{alunos.length}</strong>
          </span>
          <span className="text-emerald-600">
            Presentes: <strong>{presentesCount}</strong>
          </span>
          <span className="text-rose-600">
            Faltas: <strong>{faltasCount}</strong>
          </span>
          <span className="text-amber-600">
            Justificadas: <strong>{justificadosCount}</strong>
          </span>
          <span className="text-muted-foreground">
            Pendentes: <strong>{pendentesCount}</strong>
          </span>
        </div>
        <Input
          type="date"
          aria-label="Data da aula"
          value={dataAula}
          onChange={(e) => setDataAula(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluna</TableHead>
              <TableHead className="text-center">Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : alunos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  Nenhuma aluna alocada nesta turma. A alocação é feita na aba Alunas do núcleo.
                </TableCell>
              </TableRow>
            ) : (
              alunos.map((aluna) => {
                const status = chamadaState[aluna.user_id]?.status ?? null
                return (
                  <TableRow key={aluna.user_id}>
                    <TableCell className="font-medium">{aluna.nome_completo}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-center gap-2 xl:flex-nowrap">
                        <Button
                          type="button"
                          disabled={somenteLeitura}
                          variant={status === 'PRESENCA' ? 'default' : 'outline'}
                          className={cn(
                            'h-10 w-28 gap-1.5',
                            status === 'PRESENCA' &&
                              'bg-emerald-600 text-white hover:bg-emerald-700',
                          )}
                          onClick={() => marcar(aluna.user_id, 'PRESENCA')}
                        >
                          <Check className="h-4 w-4" /> Presença
                        </Button>
                        <Button
                          type="button"
                          disabled={somenteLeitura}
                          variant={status === 'FALTA' ? 'default' : 'outline'}
                          className={cn(
                            'h-10 w-28 gap-1.5',
                            status === 'FALTA' && 'bg-rose-600 text-white hover:bg-rose-700',
                          )}
                          onClick={() => marcar(aluna.user_id, 'FALTA')}
                        >
                          <X className="h-4 w-4" /> Falta
                        </Button>
                        <Button
                          type="button"
                          disabled={somenteLeitura}
                          variant={status === 'JUSTIFICADO' ? 'default' : 'outline'}
                          className="h-10 w-32 gap-1.5"
                          onClick={() => marcar(aluna.user_id, 'JUSTIFICADO')}
                        >
                          <MessageSquareText className="h-4 w-4" /> Justificado
                        </Button>
                        <Input
                          aria-label={`Observação de ${aluna.nome_completo}`}
                          placeholder="Observação"
                          disabled={somenteLeitura}
                          className="h-10 min-w-[180px] flex-1"
                          value={chamadaState[aluna.user_id]?.observacao ?? ''}
                          onChange={(e) => handleObservacao(aluna.user_id, e.target.value)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!somenteLeitura && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || alunos.length === 0 || pendentesCount > 0}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar chamada
          </Button>
        </div>
      )}
    </div>
  )
}
