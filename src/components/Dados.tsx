import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Um par rótulo/valor. Valor vazio vira "—" para a grade não ficar com buracos. */
export function Campo({
  rotulo,
  valor,
  largo,
}: {
  rotulo: string
  valor?: React.ReactNode
  /** Ocupa as duas colunas — para textos longos. */
  largo?: boolean
}) {
  return (
    <div className={largo ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-sm">{valor === undefined || valor === null || valor === '' ? '—' : valor}</dd>
    </div>
  )
}

/** Grade de campos em duas colunas (uma no celular). */
export function GradeDados({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {children}
    </dl>
  )
}

/**
 * Seção de dados: card com faixa de título e ícone e a grade de campos embaixo. É o mesmo desenho
 * dos cards do sistema, só que já com a grade montada.
 */
export function SecaoDados({
  titulo,
  icone: Icone,
  acao,
  children,
  semGrade,
}: {
  titulo: string
  icone: React.ElementType
  /** Botão ou badge no canto direito da faixa. */
  acao?: React.ReactNode
  children: React.ReactNode
  /** Conteúdo livre (texto, lista) em vez da grade de campos. */
  semGrade?: boolean
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icone className="h-4 w-4 text-primary" />
          {titulo}
        </CardTitle>
        {acao}
      </CardHeader>
      <CardContent className="p-4">
        {semGrade ? children : <GradeDados>{children}</GradeDados>}
      </CardContent>
    </Card>
  )
}
