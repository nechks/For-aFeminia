import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Rede de proteção da árvore inteira. Sem isto, qualquer exceção lançada
 * durante o render desmonta a aplicação e o usuário vê apenas uma tela branca,
 * sem nenhuma pista do que aconteceu.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            A página não pôde ser exibida. Tente recarregar; se o problema continuar, avise a
            equipe técnica.
          </p>
          <pre className="text-xs text-left bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {error.message}
          </pre>
          <Button onClick={this.handleReload}>Recarregar página</Button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
