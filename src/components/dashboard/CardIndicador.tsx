import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Card de indicador do painel. Todo card abre a lista por trás do número, então o clique é parte
 * do componente — nunca um card "morto" no meio de cards clicáveis.
 */
export default function CardIndicador({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  corIcone,
  corValor,
  onClick,
}: {
  titulo: string
  valor: React.ReactNode
  detalhe?: string
  icone: React.ElementType
  corIcone: string
  corValor?: string
  onClick: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        <Icone className={cn('h-4 w-4', corIcone)} />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', corValor)}>{valor}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {detalhe ? `${detalhe} · ` : ''}clique para ver a lista
        </p>
      </CardContent>
    </Card>
  )
}
