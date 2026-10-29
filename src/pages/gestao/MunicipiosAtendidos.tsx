import { useCallback, useEffect, useState } from 'react'
import {
  criarMunicipio,
  editarMunicipio,
  excluirMunicipio,
  getInteressesNaoAtendidos,
  getMunicipios,
  type InteresseNaoAtendido,
  type MunicipioAtendido,
} from '@/services/municipios'
import { getErrorMessage } from '@/lib/api/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const vazio = { nome: '', uf: 'ES', ativo: true }

/**
 * Onde o projeto atende. É esta lista que decide se a inscrição segue até a pergunta de turma ou
 * é encerrada antes — por isso ela é editável aqui, e não fixa em código.
 *
 * <p>A aba de procuras mostra quem tentou se inscrever de um município ainda não atendido.
 */
export default function MunicipiosAtendidos() {
  const [lista, setLista] = useState<MunicipioAtendido[]>([])
  const [interesses, setInteresses] = useState<InteresseNaoAtendido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<MunicipioAtendido | null>(null)
  const [form, setForm] = useState(vazio)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [municipios, procuras] = await Promise.all([
        getMunicipios(),
        getInteressesNaoAtendidos(),
      ])
      setLista(municipios)
      setInteresses(procuras)
    } catch (e) {
      toast({
        title: 'Erro ao carregar municípios',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const abrirNovo = () => {
    setEditando(null)
    setForm(vazio)
    setOpen(true)
  }

  const abrirEdicao = (m: MunicipioAtendido) => {
    setEditando(m)
    setForm({ nome: m.nome, uf: m.uf, ativo: m.ativo })
    setOpen(true)
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      if (editando) {
        await editarMunicipio(editando.id, form)
        toast({ title: '📍 Município atualizado!' })
      } else {
        await criarMunicipio(form)
        toast({ title: '📍 Município adicionado!' })
      }
      setOpen(false)
      setEditando(null)
      setForm(vazio)
      await carregar()
    } catch (e) {
      toast({
        title: 'Não foi possível salvar',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const remover = async (m: MunicipioAtendido) => {
    setSalvando(true)
    try {
      await excluirMunicipio(m.id)
      toast({ title: `${m.nome} removido da lista.` })
      await carregar()
    } catch (e) {
      toast({
        title: 'Não foi possível remover',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <MapPin className="h-7 w-7 text-primary" />
            Municípios atendidos
          </h1>
          <p className="text-muted-foreground">
            A inscrição de quem mora fora desta lista é encerrada antes da pergunta de turma.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar município
        </Button>
      </div>

      {lista.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠️ Com a lista vazia o corte fica desligado e qualquer município consegue se inscrever.
          Cadastre pelo menos um para o filtro passar a valer.
        </div>
      )}

      <Tabs defaultValue="municipios">
        <TabsList>
          <TabsTrigger value="municipios">📍 Municípios ({lista.length})</TabsTrigger>
          <TabsTrigger value="procuras">📊 Procuras fora de área ({interesses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="municipios" className="space-y-3 pt-4">
          {lista.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {m.nome} / {m.uf}
                  </p>
                  <Badge
                    variant="secondary"
                    className={
                      m.ativo
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                    }
                  >
                    {m.ativo ? 'Atendendo' : 'Pausado'}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(m)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={salvando}
                    onClick={() => remover(m)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="procuras" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Demanda reprimida</CardTitle>
              <CardDescription>
                Quem procurou o projeto em um município ainda não atendido. Nenhuma dessas pessoas
                virou cadastro pendente — o registro existe só para orientar onde abrir turma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {interesses.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  Nenhuma procura fora da área atendida até agora.
                </p>
              ) : (
                interesses.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {i.cidade}
                        {i.estado ? ` / ${i.estado}` : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {i.nome_completo ?? 'Sem nome informado'}
                        {i.telefone ? ` · ${i.telefone}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(i.created).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setEditando(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar município' : 'Adicionar município atendido'}
            </DialogTitle>
            <DialogDescription>
              Candidatas desta cidade seguem o formulário até a escolha da turma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Município *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Vitória"
              />
            </div>
            <div className="space-y-2">
              <Label>UF *</Label>
              <Input
                value={form.uf}
                maxLength={2}
                onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                placeholder="ES"
              />
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <span>
                Atendendo agora
                <span className="block text-xs text-muted-foreground">
                  Desligue para pausar sem apagar o histórico do município.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={salvando || !form.nome.trim() || form.uf.trim().length !== 2}
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
