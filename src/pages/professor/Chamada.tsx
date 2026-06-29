import { useState } from 'react'
import { useApp } from '@/store/app-context'
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
import { toast } from '@/components/ui/use-toast'
import { Save } from 'lucide-react'

export default function Chamada() {
  const { inscricoes } = useApp()
  const [turma, setTurma] = useState<string>('CENTRO_VITORIA')
  const [dataAula, setDataAula] = useState(new Date().toISOString().split('T')[0])
  const [chamadaState, setChamadaState] = useState<Record<string, boolean>>({})

  // Only show approved students for the selected turma
  const alunasDaTurma = inscricoes.filter((i) => i.status === 'APROVADA' && i.turma === turma)

  const handleToggle = (id: string, checked: boolean) => {
    setChamadaState((prev) => ({ ...prev, [id]: checked }))
  }

  const handleSave = () => {
    toast({
      title: 'Chamada Salva!',
      description: `Presenças registradas para o dia ${new Date(dataAula).toLocaleDateString()}`,
    })
  }

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
              <Select value={turma} onValueChange={setTurma}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CENTRO_VITORIA">Centro - Vitória</SelectItem>
                  <SelectItem value="AEST_SERRA">Clube AEST - Serra</SelectItem>
                  <SelectItem value="ITAQUARI_CARIACICA">Itaquari - Cariacica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluna</TableHead>
                  <TableHead>Frequência (Geral)</TableHead>
                  <TableHead className="text-right">Presença Hoje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunasDaTurma.map((aluna) => (
                  <TableRow key={aluna.id}>
                    <TableCell className="font-medium">{aluna.nomeCompleto}</TableCell>
                    <TableCell className="text-muted-foreground">80%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground mr-2">
                          {chamadaState[aluna.id] ? 'Presente' : 'Falta'}
                        </span>
                        <Switch
                          checked={chamadaState[aluna.id] || false}
                          onCheckedChange={(c) => handleToggle(aluna.id, c)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {alunasDaTurma.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nenhuma aluna aprovada nesta turma.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="bg-primary text-primary-foreground gap-2">
              <Save className="w-4 h-4" />
              Salvar Chamada
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
