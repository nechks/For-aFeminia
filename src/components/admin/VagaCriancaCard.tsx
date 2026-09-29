import { useEffect, useState } from 'react'
import {
  decidirVagaCrianca,
  getVagaCrianca,
  type VagaCrianca,
} from '@/services/ficha-inscricao'
import { getErrorMessage } from '@/lib/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Baby, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const statusInfo: Record<string, { label: string; color: string }> = {
  APROVADA: {
    label: 'Vaga aprovada',
    color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  },
  NAO_APROVADA: {
    label: 'Vaga não aprovada',
    color: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  },
}

/**
 * Decisão da vaga da criança de 5 a 12 anos. É independente da aprovação da própria aluna: dá para
 * aprovar a aluna e recusar a vaga da criança, e vice-versa.
 *
 * <p>Só existe decisão a tomar quando a aluna pediu a vaga no Espaço Kids. Se ela não pediu, o
 * card nem aparece; se pediu mas o projeto perdeu o Espaço Kids, dá para recusar, não aprovar.
 *
 * <p>A criança vem da inscrição; a ficha de confirmação é fallback para os registros antigos.
 */
export default function VagaCriancaCard({
  inscricaoId,
  podeDecidir,
}: {
  inscricaoId: string
  podeDecidir: boolean
}) {
  const [dados, setDados] = useState<VagaCrianca | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setCarregando(true)
    getVagaCrianca(inscricaoId)
      .then((v) => {
        setDados(v)
        setJustificativa(v.justificativa ?? '')
      })
      .catch(() => setDados(null))
      .finally(() => setCarregando(false))
  }, [inscricaoId])

  const decidir = async (status: 'APROVADA' | 'NAO_APROVADA') => {
    setSalvando(true)
    try {
      const atualizado = await decidirVagaCrianca(inscricaoId, status, justificativa.trim())
      setDados(atualizado)
      toast({
        title:
          status === 'APROVADA'
            ? '👧 Vaga da criança aprovada.'
            : 'Vaga da criança não aprovada.',
        description: 'A aluna foi avisada da decisão.',
      })
    } catch (e) {
      toast({
        title: 'Não foi possível registrar a decisão',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados da vaga da criança...
      </div>
    )
  }

  if (!dados) return null

  const info = dados.status ? statusInfo[dados.status] : null
  const semCriancas = dados.criancas.length === 0
  const pediuVaga = dados.solicitado === 'Sim'
  const projetoOferece = dados.espaco_kids_projeto !== false

  // Sem pedido e sem decisão registrada não há nada a mostrar — o card só poluiria a análise.
  if (!pediuVaga && semCriancas && !dados.status) return null

  // Pedido feito quando o projeto ainda tinha Espaço Kids, mas o espaço foi desligado depois.
  const espacoRemovido = pediuVaga && !projetoOferece

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium">
          <Baby className="h-4 w-4 text-primary" />
          Vaga da criança ({dados.idade_minima} a {dados.idade_maxima} anos)
        </p>
        {info && <Badge className={info.color}>{info.label}</Badge>}
      </div>

      {espacoRemovido && (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            A aluna pediu esta vaga quando o projeto tinha Espaço Kids, mas o espaço está
            desligado no cadastro do projeto. Reative o Espaço Kids no projeto para poder aprovar.
          </span>
        </div>
      )}

      {semCriancas ? (
        <p className="text-sm text-muted-foreground">
          Esta aluna não pediu vaga no Espaço Kids nem declarou criança na ficha.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {dados.criancas.map((crianca, i) => (
            <li key={`${crianca.nome}-${i}`} className="flex items-center gap-2">
              <span>{crianca.nome || 'Sem nome'}</span>
              <span className="text-muted-foreground">
                {crianca.idade == null ? 'idade não informada' : `${crianca.idade} anos`}
              </span>
              {!crianca.dentro_da_faixa && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  fora da faixa de {dados.idade_minima}–{dados.idade_maxima}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {dados.decidido_por_nome && (
        <p className="text-xs text-muted-foreground">
          Decidido por {dados.decidido_por_nome}
          {dados.decidido_em
            ? ` em ${new Date(dados.decidido_em).toLocaleDateString('pt-BR')}`
            : ''}
          {dados.justificativa ? ` · ${dados.justificativa}` : ''}
        </p>
      )}

      {podeDecidir && pediuVaga && (
        <div className="space-y-2 border-t pt-3">
          <Label htmlFor={`justificativa-${inscricaoId}`}>
            Justificativa <span className="text-muted-foreground">(obrigatória ao recusar)</span>
          </Label>
          <Textarea
            id={`justificativa-${inscricaoId}`}
            rows={2}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Ex.: criança fora da faixa etária atendida pelo projeto"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={salvando || espacoRemovido}
              onClick={() => decidir('APROVADA')}
            >
              Aprovar vaga da criança
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 hover:text-rose-700"
              disabled={salvando || !justificativa.trim()}
              onClick={() => decidir('NAO_APROVADA')}
            >
              Não aprovar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
