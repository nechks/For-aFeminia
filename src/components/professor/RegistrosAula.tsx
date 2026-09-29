import { useEffect, useRef, useState } from 'react'
import { Camera, CalendarDays, FileText, ImagePlus, Loader2, MessageSquareText, X } from 'lucide-react'
import { type MinhaTurma } from '@/services/turmas'
import {
  criarRegistroAula,
  getRegistrosAula,
  type RegistroAula,
  type TipoRegistroAula,
} from '@/services/registros-aula'
import { fileUrl } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import ExportarEvidencias from '@/components/professor/ExportarEvidencias'

interface Props {
  tipo: TipoRegistroAula
  turmas: MinhaTurma[]
}

const hoje = () => new Date().toISOString().slice(0, 10)

export default function RegistrosAula({ tipo, turmas }: Props) {
  const { toast } = useToast()
  const inputFotos = useRef<HTMLInputElement>(null)
  const [registros, setRegistros] = useState<RegistroAula[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [turmaId, setTurmaId] = useState(turmas[0]?.turma.id ?? '')
  const [dataAula, setDataAula] = useState(hoje())
  const [relatorio, setRelatorio] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [fotos, setFotos] = useState<File[]>([])

  const evidencia = tipo === 'EVIDENCIA'
  const titulo = evidencia ? 'Evidências da aula' : 'Feedback da aula'
  const descricao = evidencia
    ? 'Anexe fotos e registre o relatório ou as observações da atividade realizada.'
    : 'Ao finalizar a aula, registre como foi a atividade, os pontos importantes e anexos.'

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    getRegistrosAula(tipo)
      .then((lista) => ativo && setRegistros(lista))
      .catch((err) =>
        ativo &&
        toast({
          title: 'Não foi possível carregar os registros',
          description: getErrorMessage(err),
          variant: 'destructive',
        }),
      )
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [tipo, toast])

  function escolherFotos(event: React.ChangeEvent<HTMLInputElement>) {
    const novas = Array.from(event.target.files ?? [])
    const invalidas = novas.filter(
      (foto) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(foto.type),
    )
    if (invalidas.length) {
      toast({
        title: 'Formato não suportado',
        description: 'Use imagens JPEG, PNG, WebP ou GIF.',
        variant: 'destructive',
      })
      event.target.value = ''
      return
    }
    if (novas.some((foto) => foto.size > 10 * 1024 * 1024)) {
      toast({
        title: 'Foto muito grande',
        description: 'Cada foto deve ter no máximo 10 MB.',
        variant: 'destructive',
      })
      event.target.value = ''
      return
    }
    setFotos((atuais) => [...atuais, ...novas].slice(0, 10))
    event.target.value = ''
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault()
    if (!turmaId || !dataAula) {
      toast({ title: 'Selecione a turma e a data da aula', variant: 'destructive' })
      return
    }
    if (!relatorio.trim() && !observacoes.trim() && !fotos.length) {
      toast({
        title: 'Registro vazio',
        description: 'Adicione ao menos uma foto, um relatório ou uma observação.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const form = new FormData()
      form.append('tipo', tipo)
      form.append('turma_id', turmaId)
      form.append('data_aula', dataAula)
      form.append('relatorio', relatorio)
      form.append('observacoes', observacoes)
      fotos.forEach((foto) => form.append('fotos', foto))
      const criado = await criarRegistroAula(form)
      setRegistros((atuais) => [criado, ...atuais])
      setRelatorio('')
      setObservacoes('')
      setFotos([])
      toast({ title: evidencia ? 'Evidência registrada!' : 'Feedback registrado!' })
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {evidencia ? (
                  <Camera className="h-5 w-5" />
                ) : (
                  <MessageSquareText className="h-5 w-5" />
                )}
                {titulo}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{descricao}</p>
            </div>
            <ExportarEvidencias tipo={tipo} turmas={turmas} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvar} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Turma *</Label>
                <Select value={turmaId} onValueChange={setTurmaId} disabled={!turmas.length}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((vinculo) => (
                      <SelectItem key={vinculo.turma.id} value={vinculo.turma.id}>
                        {vinculo.turma.nome} · {vinculo.nucleo_nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${tipo}-data`}>Data da aula *</Label>
                <Input
                  id={`${tipo}-data`}
                  type="date"
                  max={hoje()}
                  value={dataAula}
                  onChange={(event) => setDataAula(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${tipo}-relatorio`}>Relatório da aula</Label>
              <Textarea
                id={`${tipo}-relatorio`}
                value={relatorio}
                onChange={(event) => setRelatorio(event.target.value)}
                placeholder="Descreva as atividades realizadas, objetivos e resultados da aula..."
                className="min-h-32"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${tipo}-observacoes`}>Observações</Label>
              <Textarea
                id={`${tipo}-observacoes`}
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                placeholder="Registre ocorrências, dificuldades, avanços ou pontos para a próxima aula..."
                className="min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Fotos da aula</Label>
              <input
                ref={inputFotos}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={escolherFotos}
              />
              <Button type="button" variant="outline" onClick={() => inputFotos.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Anexar fotos
              </Button>
              <p className="text-xs text-muted-foreground">Até 10 fotos, com no máximo 10 MB cada.</p>
              {fotos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {fotos.map((foto, index) => (
                    <Badge key={`${foto.name}-${index}`} variant="secondary" className="gap-1 py-1">
                      {foto.name}
                      <button
                        type="button"
                        aria-label={`Remover ${foto.name}`}
                        onClick={() => setFotos((atuais) => atuais.filter((_, i) => i !== index))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {!turmas.length && (
              <p className="text-sm text-destructive">
                Você precisa estar vinculada a uma turma para criar este registro.
              </p>
            )}
            <Button type="submit" disabled={salvando || !turmas.length}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {salvando ? 'Salvando...' : evidencia ? 'Salvar evidência' : 'Salvar feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico</h2>
        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : registros.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum {evidencia ? 'registro de evidência' : 'feedback'} enviado ainda.
            </CardContent>
          </Card>
        ) : (
          registros.map((registro) => (
            <Card key={registro.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{registro.turma_nome}</CardTitle>
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(`${registro.data_aula}T00:00:00`).toLocaleDateString('pt-BR')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {registro.relatorio && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Relatório</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{registro.relatorio}</p>
                  </div>
                )}
                {registro.observacoes && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Observações</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{registro.observacoes}</p>
                  </div>
                )}
                {registro.fotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {registro.fotos.map((foto) => (
                      <a
                        key={foto.id}
                        href={fileUrl(foto.arquivo)}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-md border bg-muted"
                      >
                        <img
                          src={fileUrl(foto.arquivo)}
                          alt={foto.nome_original || 'Foto da aula'}
                          className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  )
}
