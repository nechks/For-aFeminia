import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getPresencasTurma,
  registrarPresencas,
  type PresencaAluno,
  type RegistroPresenca,
} from '@/services/presenca'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Save, Loader2, Check, X, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { turmaLabels } from '@/lib/constants'

type StatusChamada = 'PRESENCA' | 'FALTA' | 'JUSTIFICADO' | null

interface RegistroChamadaState {
  status: StatusChamada
  observacao: string
}

export default function Chamada() {
  const { user } = useApp()
  const turmaProfessor = user?.turma ?? ''
  const [turma, setTurma] = useState<string>(turmaProfessor)
  const [dataAula, setDataAula] = useState(new Date().toISOString().split('T')[0])
  const [alunos, setAlunos] = useState<PresencaAluno[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [chamadaState, setChamadaState] = useState<Record<string, RegistroChamadaState>>({})

  const loadData = useCallback(async () => {
    if (!turma || !dataAula) return
    setLoading(true)
    try {
      const result = await getPresencasTurma(turma, dataAula)
      setAlunos(result.alunos)
      const state: Record<string, RegistroChamadaState> = {}
      result.alunos.forEach((a) => {
        const justificativa = a.presenca?.justificativa ?? ''
        state[a.user_id] = {
          status: !a.presenca
            ? null
            : a.presenca.presente
              ? 'PRESENCA'
              : a.presenca.justificada
                ? 'JUSTIFICADO'
                : 'FALTA',
          observacao: justificativa,
        }
      })
      setChamadaState(state)
    } catch (err) {
      console.error('Failed to load presencas:', err)
      toast({ title: 'Erro ao carregar lista de presença', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [turma, dataAula])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('presenca', () => {
    loadData()
  })

  const handlePresenca = (userId: string) => {
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { status: 'PRESENCA', observacao: prev[userId]?.observacao ?? '' },
    }))
  }

  const handleFalta = (userId: string) => {
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { status: 'FALTA', observacao: prev[userId]?.observacao ?? '' },
    }))
  }

  const handleJustificado = (userId: string) => {
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { status: 'JUSTIFICADO', observacao: prev[userId]?.observacao ?? '' },
    }))
  }

  const handleObservacao = (userId: string, value: string) => {
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], observacao: value },
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
      await registrarPresencas(dataAula, registros, turma)
      toast({
        title: 'Chamada Salva!',
        description: `Presenças registradas para ${new Date(dataAula).toLocaleDateString('pt-BR')}`,
      })
      loadData()
    } catch (err) {
      console.error('Failed to save presencas:', err)
      toast({ title: 'Erro ao salvar chamada', variant: 'destructive' })
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registro de Chamada</h1>
        <p className="text-muted-foreground mt-1">
          Selecione a turma e a data para registrar a presença das alunas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Filtros da Aula</CardTitle>
              <CardDescription>Defina os parâmetros antes de fazer a chamada</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={dataAula}
                onChange={(e) => setDataAula(e.target.value)}
                className="w-40"
              />
              {turmaProfessor ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm font-medium w-[200px]">
                  {turmaLabels[turmaProfessor] ?? turmaProfessor}
                </div>
              ) : (
                <Select value={turma} onValueChange={setTurma}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(turmaLabels).map((t) => (
                      <SelectItem key={t} value={t}>
                        {turmaLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-muted-foreground">
              Total de alunas: <strong>{alunos.length}</strong>
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

          <div className="rounded-md border mt-2">
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
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : alunos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                      Nenhuma aluna aprovada nesta turma.
                    </TableCell>
                  </TableRow>
                ) : (
                  alunos.map((aluna) => {
                    const estado = chamadaState[aluna.user_id]
                    const status = estado?.status ?? null
                    return (
                      <TableRow key={aluna.user_id}>
                        <TableCell className="font-medium">{aluna.nome_completo}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2 flex-wrap xl:flex-nowrap">
                            <Button
                              type="button"
                              variant={status === 'PRESENCA' ? 'default' : 'outline'}
                              className={cn(
                                'h-10 w-28 gap-1.5',
                                status === 'PRESENCA' &&
                                  'bg-emerald-600 hover:bg-emerald-700 text-white',
                              )}
                              onClick={() => handlePresenca(aluna.user_id)}
                            >
                              <Check className="w-4 h-4" /> Presença
                            </Button>
                            <Button
                              type="button"
                              variant={status === 'FALTA' ? 'default' : 'outline'}
                              className={cn(
                                'h-10 w-28 gap-1.5',
                                status === 'FALTA' && 'bg-rose-600 hover:bg-rose-700 text-white',
                              )}
                              onClick={() => handleFalta(aluna.user_id)}
                            >
                              <X className="w-4 h-4" /> Falta
                            </Button>
                            <Button
                              type="button"
                              variant={status === 'JUSTIFICADO' ? 'default' : 'outline'}
                              className="h-10 w-32 gap-1.5"
                              onClick={() => handleJustificado(aluna.user_id)}
                            >
                              <MessageSquareText className="w-4 h-4" /> Justificado
                            </Button>
                            <Input
                              aria-label={`Observação de ${aluna.nome_completo}`}
                              placeholder="Observação"
                              className="h-10 min-w-[180px] flex-1"
                              value={estado?.observacao ?? ''}
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

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || alunos.length === 0 || pendentesCount > 0}
              className="bg-primary text-primary-foreground gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Chamada
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
