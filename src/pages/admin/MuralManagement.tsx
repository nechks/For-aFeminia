import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getMural, createMural, deleteMural } from '@/services/mural'
import { criarEvento, NovaPergunta } from '@/services/eventos'
import { Mural, Usuario } from '@/lib/types'
import api from '@/lib/api/client'
import { turmaLabels, nucleosCadastrados } from '@/lib/constants'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Bell, Loader2, CalendarDays, X } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export default function MuralManagement() {
  const [avisos, setAvisos] = useState<Mural[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [turma, setTurma] = useState('ALL')
  const [exibirAte, setExibirAte] = useState('')

  // Novo Evento (todo evento exige pelo menos uma pergunta de inscrição, cada uma com
  // pelo menos 2 alternativas fixas — a aluna responde por seleção, sem texto livre)
  const [evTitulo, setEvTitulo] = useState('')
  const [evDescricao, setEvDescricao] = useState('')
  const [evData, setEvData] = useState('')
  const [evHorarioInicio, setEvHorarioInicio] = useState('')
  const [evHorarioFim, setEvHorarioFim] = useState('')
  const [evTurma, setEvTurma] = useState('ALL')
  const [professores, setProfessores] = useState<Usuario[]>([])
  const [professorIds, setProfessorIds] = useState<string[]>([])
  const [evPerguntas, setEvPerguntas] = useState<NovaPergunta[]>([])
  const [novaPergunta, setNovaPergunta] = useState('')
  const [novaOpcao, setNovaOpcao] = useState('')
  const [draftOpcoes, setDraftOpcoes] = useState<string[]>([])
  const [savingEvento, setSavingEvento] = useState(false)

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
    api.get<Usuario[]>('/api/users?perfil=PROFESSOR').then((profs) => {
      setProfessores(profs.filter((u) => u.ativo))
    }).catch(() => toast({ title: 'Erro ao carregar responsáveis do evento', variant: 'destructive' }))
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
        exibirAte: exibirAte || undefined,
      })
      setTitulo('')
      setConteudo('')
      setTurma('ALL')
      setExibirAte('')
      toast({ title: 'Aviso publicado!' })
      loadAvisos()
    } catch (err) {
      console.error('Failed to create mural:', err)
      toast({ title: 'Erro ao publicar aviso', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addOpcao = () => {
    const opcao = novaOpcao.trim()
    if (!opcao || draftOpcoes.includes(opcao)) return
    setDraftOpcoes((arr) => [...arr, opcao])
    setNovaOpcao('')
  }

  const addPergunta = () => {
    if (!novaPergunta.trim()) {
      toast({ title: 'Digite a pergunta', variant: 'destructive' })
      return
    }
    if (draftOpcoes.length < 2) {
      toast({ title: 'Adicione pelo menos duas alternativas', variant: 'destructive' })
      return
    }
    setEvPerguntas((p) => [...p, { pergunta: novaPergunta.trim(), opcoes: draftOpcoes }])
    setNovaPergunta('')
    setNovaOpcao('')
    setDraftOpcoes([])
  }

  const podePublicarEvento =
    evTitulo.trim() && evDescricao.trim() && evData && evHorarioInicio && evHorarioFim &&
    evHorarioFim > evHorarioInicio && professorIds.length > 0 && evPerguntas.length > 0

  const handleCreateEvento = async () => {
    if (!podePublicarEvento) return
    setSavingEvento(true)
    try {
      await criarEvento({
        titulo: evTitulo.trim(),
        descricao: evDescricao.trim(),
        data_evento: evData,
        horario_inicio: evHorarioInicio,
        horario_fim: evHorarioFim,
        professor_ids: professorIds,
        turma: evTurma === 'ALL' ? '' : evTurma,
        perguntas: evPerguntas,
      })
      setEvTitulo('')
      setEvDescricao('')
      setEvData('')
      setEvHorarioInicio('')
      setEvHorarioFim('')
      setEvTurma('ALL')
      setProfessorIds([])
      setEvPerguntas([])
      setNovaPergunta('')
      setNovaOpcao('')
      setDraftOpcoes([])
      toast({
        title: 'Evento publicado!',
        description: 'As alunas já podem se inscrever respondendo às perguntas.',
      })
    } catch (err) {
      console.error('Failed to create evento:', err)
      toast({ title: 'Erro ao publicar evento', variant: 'destructive' })
    } finally {
      setSavingEvento(false)
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
          <CardDescription>
            Deixe a turma em branco para um aviso geral. Depois que a data do aviso passa, ele
            sai do painel das alunas automaticamente — mas fica salvo aqui no Mural.
          </CardDescription>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma (opcional)</label>
              <Select value={turma} onValueChange={setTurma}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Geral (todas as turmas)</SelectItem>
                  {nucleosCadastrados.map(({ codigo, nome }) => (
                    <SelectItem key={codigo} value={codigo}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exibir no painel até (opcional)</label>
              <Input
                type="date"
                className="w-full sm:w-[280px]"
                min={new Date().toISOString().split('T')[0]}
                value={exibirAte}
                onChange={(e) => setExibirAte(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Em branco, o aviso aparece só no dia da publicação.
              </p>
            </div>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Novo Evento
          </CardTitle>
          <CardDescription>
            Todo evento tem perguntas de inscrição — adicione pelo menos uma para liberar a
            publicação. Após a data, o evento sai do mural automaticamente (mas fica salvo no
            histórico da aba Eventos).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título do evento</label>
              <Input
                value={evTitulo}
                onChange={(e) => setEvTitulo(e.target.value)}
                placeholder="Ex.: Aulão de defesa pessoal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data do evento</label>
              <Input type="date" value={evData} onChange={(e) => setEvData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário de início</label>
              <Input type="time" value={evHorarioInicio} onChange={(e) => setEvHorarioInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário de término</label>
              <Input type="time" min={evHorarioInicio} value={evHorarioFim} onChange={(e) => setEvHorarioFim(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={evDescricao}
              onChange={(e) => setEvDescricao(e.target.value)}
              placeholder="Detalhes do evento"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Turma (opcional)</label>
            <Select value={evTurma} onValueChange={setEvTurma}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Geral (todas as turmas)</SelectItem>
                {nucleosCadastrados.map(({ codigo, nome }) => (
                  <SelectItem key={codigo} value={codigo}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
              <label className="text-sm font-medium">Professores responsáveis *</label>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                {professores.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum professor ativo cadastrado.</p> : professores.map((prof) => (
                  <label key={prof.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={professorIds.includes(prof.id)} onCheckedChange={(checked) => setProfessorIds((ids) => checked ? [...ids, prof.id] : ids.filter((id) => id !== prof.id))} /><span>{prof.name}</span></label>
                ))}
              </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Perguntas da inscrição</label>
            <div className="rounded-md border p-3 space-y-3">
              <Input
                value={novaPergunta}
                onChange={(e) => setNovaPergunta(e.target.value)}
                placeholder="Pergunta. Ex.: Possui alguma restrição alimentar?"
              />
              <div className="flex gap-2">
                <Input
                  value={novaOpcao}
                  onChange={(e) => setNovaOpcao(e.target.value)}
                  placeholder="Alternativa de resposta. Ex.: Sim"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOpcao()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={addOpcao}
                >
                  <Plus className="w-4 h-4" /> Alternativa
                </Button>
              </div>
              {draftOpcoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draftOpcoes.map((o, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      {o}
                      <button
                        type="button"
                        className="hover:text-destructive"
                        onClick={() =>
                          setDraftOpcoes((arr) => arr.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  A aluna responde escolhendo uma alternativa — adicione pelo menos 2 opções.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={addPergunta}
                >
                  <Plus className="w-4 h-4" /> Adicionar pergunta
                </Button>
              </div>
            </div>
            {evPerguntas.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma pergunta adicionada — a publicação fica bloqueada até ter pelo menos uma.
              </p>
            ) : (
              <div className="space-y-1.5">
                {evPerguntas.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <span>
                        {idx + 1}. {p.pergunta}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {p.opcoes.map((o, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {o}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setEvPerguntas((arr) => arr.filter((_, i) => i !== idx))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreateEvento}
            disabled={!podePublicarEvento || savingEvento}
            className="bg-primary text-primary-foreground gap-2"
          >
            {savingEvento ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarDays className="w-4 h-4" />
            )}
            Publicar Evento
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
                          ? new Date(aviso.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                          : ''}
                        {aviso.exibir_ate &&
                          ` · no painel até ${new Date(aviso.exibir_ate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
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
