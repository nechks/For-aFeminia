import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getMural, createMural, deleteMural } from '@/services/mural'
import { Mural } from '@/lib/types'
import { turmaLabels } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Bell, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export default function MuralManagement() {
  const [avisos, setAvisos] = useState<Mural[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [turma, setTurma] = useState('ALL')

  const loadAvisos = useCallback(async () => {
    try {
      const data = await getMural()
      setAvisos(data as unknown as Mural[])
    } catch (err) {
      console.error('Failed to load mural:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAvisos()
  }, [loadAvisos])

  useRealtime('mural', () => {
    loadAvisos()
  })

  const handleCreate = async () => {
    if (!titulo.trim() || !conteudo.trim()) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createMural({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        turma: turma === 'ALL' ? undefined : turma,
      })
      setTitulo('')
      setConteudo('')
      setTurma('ALL')
      toast({ title: 'Aviso publicado!' })
      loadAvisos()
    } catch (err) {
      console.error('Failed to create mural:', err)
      toast({ title: 'Erro ao publicar aviso', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMural(id)
      toast({ title: 'Aviso removido' })
      loadAvisos()
    } catch (err) {
      console.error('Failed to delete mural:', err)
      toast({ title: 'Erro ao remover aviso', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mural de Avisos</h1>
        <p className="text-muted-foreground mt-1">
          Publique comunicados gerais ou direcionados a uma turma específica.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Aviso</CardTitle>
          <CardDescription>Deixe a turma em branco para um aviso geral.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do aviso"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Conteúdo</label>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Conteúdo do aviso"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Turma (opcional)</label>
            <Select value={turma} onValueChange={setTurma}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Geral (todas as turmas)</SelectItem>
                {Object.entries(turmaLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-primary text-primary-foreground gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Publicar Aviso
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Avisos Publicados</CardTitle>
            <CardDescription>{avisos.length} aviso(s) no mural</CardDescription>
          </div>
          <Bell className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : avisos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum aviso publicado ainda.
            </p>
          ) : (
            avisos.map((aviso) => (
              <div key={aviso.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {aviso.turma ? (turmaLabels[aviso.turma] ?? aviso.turma) : 'Geral'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {aviso.data_publicacao
                          ? new Date(aviso.data_publicacao).toLocaleDateString('pt-BR')
                          : ''}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm">{aviso.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{aviso.conteudo}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(aviso.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
