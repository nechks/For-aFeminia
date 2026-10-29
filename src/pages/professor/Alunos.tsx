import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/store/app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { getAlunasByTurma } from '@/services/ficha-inscricao'
import { FichaInscricaoFF } from '@/lib/types'
import { turmaLabels, getStatusInfo } from '@/lib/constants'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, Phone, MapPin } from 'lucide-react'

export default function Alunos() {
  const { user } = useApp()
  const turmaProfessor = user?.turma ?? ''
  const [turma, setTurma] = useState<string>(turmaProfessor)
  const [alunas, setAlunas] = useState<FichaInscricaoFF[]>([])
  const [loading, setLoading] = useState(false)

  // `silencioso` é a atualização automática: não mostra "carregando" nem apaga a lista se falhar.
  const loadData = useCallback(async (silencioso = false) => {
    if (!turma) return
    if (!silencioso) setLoading(true)
    try {
      const data = await getAlunasByTurma(turma)
      setAlunas(data)
    } catch (err) {
      console.error('Failed to load alunas:', err)
      if (!silencioso) setAlunas([])
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [turma])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('ficha_inscricao_ff', () => {
    loadData(true)
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alunas do Núcleo</h1>
        <p className="text-muted-foreground mt-1">
          Visualize as alunas matriculadas em cada núcleo (turma).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Alunas Matriculadas
              </CardTitle>
              <CardDescription>
                Total de alunas aprovadas:{' '}
                <strong className="text-foreground">{alunas.length}</strong>
              </CardDescription>
            </div>
            <Select value={turma} onValueChange={setTurma}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione o núcleo" />
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
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell">Bairro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : alunas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhuma aluna aprovada neste núcleo.
                    </TableCell>
                  </TableRow>
                ) : (
                  alunas.map((aluna) => {
                    const status = getStatusInfo(aluna.status)
                    return (
                      <TableRow key={aluna.id}>
                        <TableCell className="font-medium">{aluna.nome_completo}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {aluna.telefone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {aluna.telefone}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {aluna.bairro ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {aluna.bairro}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
