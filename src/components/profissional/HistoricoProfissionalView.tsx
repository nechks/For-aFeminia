import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, EyeOff, MessageCircle, Star } from 'lucide-react'
import { fileUrl } from '@/lib/api/client'
import { tipoProfissionalLabel } from '@/lib/turmas'
import { type HistoricoProfissional, type TipoHistorico } from '@/services/historico-profissional'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const tipoInfo: Record<TipoHistorico, { label: string; className: string; icon: typeof Star }> = {
  AVALIACAO_POSITIVA: { label: 'Avaliação positiva', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  AVALIACAO_NEGATIVA: { label: 'Avaliação negativa', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
  CONVERSA: { label: 'Conversa', className: 'bg-blue-100 text-blue-800', icon: MessageCircle },
  ADVERTENCIA: { label: 'Advertência', className: 'bg-amber-100 text-amber-900', icon: AlertTriangle },
  OBSERVACAO: { label: 'Observação', className: 'bg-slate-100 text-slate-800', icon: ClipboardCheck },
}

export default function HistoricoProfissionalView({ historico, gestao = false }: { historico: HistoricoProfissional; gestao?: boolean }) {
  const { profissional, participacoes, assiduidade, registros } = historico
  const nome = profissional.nome_social || profissional.nome

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16 border">
            {profissional.avatar && <AvatarImage src={fileUrl(profissional.avatar)} alt={nome} />}
            <AvatarFallback className="text-lg">{nome.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{nome}</h2>
            <p className="text-sm text-muted-foreground">{profissional.email}</p>
            {profissional.tipo_profissional && (
              <Badge variant="secondary" className="mt-2">
                {tipoProfissionalLabel(profissional.tipo_profissional)}
              </Badge>
            )}
          </div>
          <Badge variant={profissional.ativo ? 'default' : 'outline'}>
            {profissional.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Chamadas registradas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{assiduidade.chamadas_registradas}</p><p className="text-xs text-muted-foreground">Dias/tipos de chamada conduzidos</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Registros de aula</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{assiduidade.registros_aula}</p><p className="text-xs text-muted-foreground">Evidências de aula enviadas</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Projetos e atuações</CardTitle></CardHeader>
        <CardContent>
          {!participacoes.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma participação registrada.</p>
          ) : (
            <div className="space-y-3">
              {participacoes.map((item, index) => (
                <div key={`${item.turma_nome}-${item.inicio}-${index}`} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-medium">{item.projeto_nome}</p><p className="text-sm text-muted-foreground">{item.nucleo_nome} · {item.turma_nome}</p></div>
                    <Badge variant={item.ativo ? 'default' : 'outline'}>{item.ativo ? 'Em atuação' : 'Encerrado'}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{tipoProfissionalLabel(item.tipo_profissional)}</span>
                    <span>Início: {new Date(item.inicio).toLocaleDateString('pt-BR')}</span>
                    {item.fim && <span>Fim: {new Date(item.fim).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Avaliações e histórico</CardTitle></CardHeader>
        <CardContent>
          {!registros.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação ou ocorrência registrada.</p>
          ) : (
            <div className="space-y-4">
              {registros.map((registro) => {
                const info = tipoInfo[registro.tipo]
                const Icon = info.icon
                return (
                  <div key={registro.id} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={info.className}><Icon className="mr-1 h-3.5 w-3.5" />{info.label}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(`${registro.data_registro}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                      {gestao && !registro.visivel_profissional && <Badge variant="outline"><EyeOff className="mr-1 h-3 w-3" />Interno</Badge>}
                    </div>
                    <p className="mt-2 font-medium">{registro.titulo}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{registro.descricao}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Registrado por {registro.registrado_por_nome}</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
