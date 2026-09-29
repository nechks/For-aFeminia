import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Camera, ImageIcon, Loader2, Search, UserRound } from 'lucide-react'
import { getRegistrosAula, type RegistroAula } from '@/services/registros-aula'
import { getErrorMessage } from '@/lib/api/errors'
import { fileUrl } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TODOS = 'TODOS'

export default function Evidencias() {
  const { toast } = useToast()
  const [evidencias, setEvidencias] = useState<RegistroAula[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [nucleo, setNucleo] = useState(TODOS)
  const [profissional, setProfissional] = useState(TODOS)
  const [data, setData] = useState('')

  useEffect(() => {
    let ativo = true
    getRegistrosAula('EVIDENCIA')
      .then((lista) => ativo && setEvidencias(lista))
      .catch((err) => {
        if (!ativo) return
        toast({
          title: 'Não foi possível carregar as evidências',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [toast])

  const nucleos = useMemo(
    () =>
      Array.from(new Set(evidencias.map((item) => item.nucleo_nome))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [evidencias],
  )

  const profissionais = useMemo(
    () =>
      Array.from(
        new Map(evidencias.map((item) => [item.profissional_id, item.profissional_nome])).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')),
    [evidencias],
  )

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return evidencias.filter((item) => {
      if (nucleo !== TODOS && item.nucleo_nome !== nucleo) return false
      if (profissional !== TODOS && item.profissional_id !== profissional) return false
      if (data && item.data_aula !== data) return false
      if (!termo) return true
      return [item.profissional_nome, item.nucleo_nome, item.turma_nome, item.relatorio, item.observacoes]
        .filter(Boolean)
        .some((valor) => String(valor).toLocaleLowerCase('pt-BR').includes(termo))
    })
  }, [busca, data, evidencias, nucleo, profissional])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Evidências</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe fotos, relatórios e observações publicados pelos profissionais.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar nas evidências"
              className="pl-9"
            />
          </div>
          <Select value={nucleo} onValueChange={setNucleo}>
            <SelectTrigger aria-label="Filtrar por núcleo">
              <SelectValue placeholder="Todos os núcleos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os núcleos</SelectItem>
              {nucleos.map((nome) => (
                <SelectItem key={nome} value={nome}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={profissional} onValueChange={setProfissional}>
            <SelectTrigger aria-label="Filtrar por profissional">
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os profissionais</SelectItem>
              {profissionais.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="Filtrar por data da aula"
            value={data}
            onChange={(event) => setData(event.target.value)}
          />
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium">Nenhuma evidência encontrada</p>
            <p className="text-sm text-muted-foreground">
              Os registros publicados pelos profissionais aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {filtradas.length} {filtradas.length === 1 ? 'evidência encontrada' : 'evidências encontradas'}
          </p>
          {filtradas.map((registro) => (
            <Card key={registro.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserRound className="h-4 w-4 text-primary" />
                      {registro.profissional_nome}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {registro.nucleo_nome} · {registro.turma_nome}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(`${registro.data_aula}T00:00:00`).toLocaleDateString('pt-BR')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {registro.relatorio && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Relatório da aula</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {registro.relatorio}
                    </p>
                  </div>
                )}
                {registro.observacoes && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Observações</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {registro.observacoes}
                    </p>
                  </div>
                )}
                {registro.fotos.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Fotos anexadas</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                            loading="lazy"
                            className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Registro sem fotos anexadas.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}
