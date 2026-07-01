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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { Save, Loader2 } from 'lucide-react'
import { turmaLabels } from '@/lib/constants'

export default function Chamada() {
  const { user } = useApp()
  const turmaProfessor = user?.turma ?? ''
  const [turma, setTurma] = useState<string>(turmaProfessor)
  const [dataAula, setDataAula] = useState(new Date().toISOString().split('T')[0])
  const [alunos, setAlunos] = useState<PresencaAluno[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [chamadaState, setChamadaState] = useState<
    Record<string, { presente: boolean; justificativa: string }>
  >({})

  const loadData = useCallback(async () => {
    if (!turma || !dataAula) return
    setLoading(true)
    try {
      const result = await getPresencasTurma(turma, dataAula)
      setAlunos(result.alunos)
      const state: Record<string, { presente: boolean; justificativa: string }> = {}
      result.alunos.forEach((a) => {
        state[a.user_id] = {
          presente: a.presenca?.presente ?? false,
          justificativa: a.presenca?.justificativa ?? '',
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

  const handleToggle = (userId: string, checked: boolean) => {
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], presente: checked },
    }))
  }

  const handleJustificativa = (userId: string, value: string) => {
    setChamadaState((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], justificativa: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const registros: RegistroPresenca[] = alunos.map((a) => ({
        user_id: a.user_id,
        presente: chamadaState[a.user_id]?.presente ?? false,
        justificativa: chamadaState[a.user_id]?.justificativa ?? '',
      }))
      await registrarPresencas(dataAula, registros)
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

  const presentesCount = Object.values(chamadaState).filter((s) => s.presente).length

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
              Ausentes: <strong>{alunos.length - presentesCount}</strong>
            </span>
          </div>

          <div className="rounded-md border mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluna</TableHead>
                  <TableHead className="text-center">Presença</TableHead>
                  <TableHead>Justificativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : alunos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nenhuma aluna aprovada nesta turma.
                    </TableCell>
                  </TableRow>
                ) : (
                  alunos.map((aluna) => (
                    <TableRow key={aluna.user_id}>
                      <TableCell className="font-medium">{aluna.nome_completo}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm text-muted-foreground mr-2">
                            {chamadaState[aluna.user_id]?.presente ? 'Presente' : 'Falta'}
                          </span>
                          <Switch
                            checked={chamadaState[aluna.user_id]?.presente ?? false}
                            onCheckedChange={(c) => handleToggle(aluna.user_id, c)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Justificativa (opcional)"
                          className="min-h-[36px] text-sm"
                          value={chamadaState[aluna.user_id]?.justificativa ?? ''}
                          onChange={(e) => handleJustificativa(aluna.user_id, e.target.value)}
                          disabled={chamadaState[aluna.user_id]?.presente}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || alunos.length === 0}
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
