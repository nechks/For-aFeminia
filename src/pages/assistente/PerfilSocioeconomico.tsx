import { useCallback, useEffect, useState } from 'react'
import { getSocioeconomico } from '@/services/indicadores'
import GraficosSocioeconomicos, {
  type DistribuicaoSocioeconomica,
} from '@/components/dashboard/GraficosSocioeconomicos'
import { useRealtime } from '@/hooks/use-realtime'
import { getErrorMessage } from '@/lib/api/errors'
import { AlertCircle, Loader2, PieChart } from 'lucide-react'

/**
 * Página da Assistente Social com os gráficos do perfil socioeconômico. Traz só as contagens de
 * renda e moradia; os demais indicadores continuam com a Gestão e o Administrativo.
 */
export default function PerfilSocioeconomico() {
  const [dados, setDados] = useState<DistribuicaoSocioeconomica | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      setDados(await getSocioeconomico())
      setErro('')
    } catch (e) {
      setErro(getErrorMessage(e))
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useRealtime('indicadores_socioeconomico', () => carregar())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <PieChart className="h-7 w-7 text-primary" /> Perfil socioeconômico
        </h1>
        <p className="mt-1 text-muted-foreground">
          Renda familiar per capita e tipo de moradia das alunas, a partir das fichas de confirmação.
        </p>
      </div>
      {erro ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {erro}
        </p>
      ) : !dados ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GraficosSocioeconomicos dados={dados} />
        </div>
      )}
    </div>
  )
}
