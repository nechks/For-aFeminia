/* Card Component primitives - A component that displays a card - from shadcn/ui (exposes Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent) */
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * `secao` é o padrão do sistema: cabeçalho em faixa com borda embaixo, como as seções da análise de
 * inscrição. `plano` é para cards que só servem de contêiner de página (login, telas de sucesso,
 * formulário de inscrição) e não devem ganhar a faixa.
 */
type CardVariant = 'secao' | 'plano'

const CardVariantContext = React.createContext<CardVariant>('secao')

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }
>(({ className, variant = 'secao', ...props }, ref) => (
  <CardVariantContext.Provider value={variant}>
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        // Sem isso o fundo da faixa vaza pelos cantos arredondados.
        variant === 'secao' && 'overflow-hidden',
        className,
      )}
      {...props}
    />
  </CardVariantContext.Provider>
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const variant = React.useContext(CardVariantContext)
    return (
      <div
        ref={ref}
        className={cn(
          variant === 'secao'
            ? 'flex flex-col space-y-1 border-b bg-muted/40 px-5 py-3'
            : 'flex flex-col space-y-1.5 p-6',
          className,
        )}
        {...props}
      />
    )
  },
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const variant = React.useContext(CardVariantContext)
    return (
      <div
        ref={ref}
        className={cn(
          variant === 'secao'
            ? // Ícone do título em roxo, como nas seções de dados; quem já definiu cor mantém a sua.
              "text-base font-semibold leading-tight [&>svg:not([class*='text-'])]:text-primary"
            : 'text-2xl font-semibold leading-none tracking-tight',
          className,
        )}
        {...props}
      />
    )
  },
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const variant = React.useContext(CardVariantContext)
    return (
      <div ref={ref} className={cn(variant === 'secao' ? 'p-5' : 'p-6 pt-0', className)} {...props} />
    )
  },
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const variant = React.useContext(CardVariantContext)
    return (
      <div
        ref={ref}
        className={cn(
          variant === 'secao'
            ? 'flex items-center border-t bg-muted/20 px-5 py-3'
            : 'flex items-center p-6 pt-0',
          className,
        )}
        {...props}
      />
    )
  },
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
