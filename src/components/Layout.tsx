import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar, TopHeader } from './Navigation'
import { useApp } from '@/store/app-context'

/** Rotas que exigem aluna aprovada com ficha de confirmação finalizada (regra 2.2). */
const ROTAS_ALUNA_LIBERADA = ['/aluna/dashboard', '/aluna/calendario']

export default function Layout() {
  const { user, authLoading, alunaLiberada, alunaGateReady } = useApp()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  const isPublicRoute = location.pathname === '/' || location.pathname === '/inscricao'

  if (isPublicRoute && !user) {
    return (
      <main className="min-h-screen bg-background flex flex-col animate-fade-in">
        <Outlet />
      </main>
    )
  }

  // Gating da aluna: sem aprovação + ficha confirmada, só Meu Perfil e Ficha de Confirmação
  if (
    user?.perfil === 'ALUNA_FF' &&
    !alunaLiberada &&
    ROTAS_ALUNA_LIBERADA.includes(location.pathname)
  ) {
    if (!alunaGateReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      )
    }
    // Leva para a Ficha, onde ela vê o andamento da inscrição (aguardando/aprovada) ou
    // preenche a matrícula quando aprovada.
    return <Navigate to="/aluna/ficha" replace />
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-4 md:p-8 animate-fade-in overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
