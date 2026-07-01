import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AppProvider, useApp } from '@/store/app-context'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Inscricao from './pages/Inscricao'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminInscricoes from './pages/admin/AdminInscricoes'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import MuralManagement from './pages/admin/MuralManagement'
import DashboardAluna from './pages/aluna/DashboardAluna'
import PerfilAluna from './pages/aluna/PerfilAluna'
import FichaConfirmacao from './pages/aluna/FichaConfirmacao'
import Calendario from './pages/aluna/Calendario'
import Chamada from './pages/professor/Chamada'
import Atendimentos from './pages/professor/Atendimentos'
import GestaoDashboard from './pages/gestao/GestaoDashboard'

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) => {
  const { user, authLoading } = useApp()
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  if (!allowedRoles.includes(user.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

const AppRoutes = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Index />} />
      <Route path="/inscricao" element={<Inscricao />} />

      <Route
        path="/admin/inscricoes"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL', 'ASSISTENTE_SOCIAL']}>
            <AdminInscricoes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <AdminUsuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/mural"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <MuralManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/gestao/dashboard"
        element={
          <ProtectedRoute allowedRoles={['GESTAO_GERAL']}>
            <GestaoDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/aluna/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ALUNA_FF']}>
            <DashboardAluna />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aluna/perfil"
        element={
          <ProtectedRoute
            allowedRoles={[
              'ALUNA_FF',
              'PROFESSOR',
              'ADMINISTRATIVO',
              'ASSISTENTE_SOCIAL',
              'GESTAO_GERAL',
            ]}
          >
            <PerfilAluna />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aluna/ficha"
        element={
          <ProtectedRoute allowedRoles={['ALUNA_FF']}>
            <FichaConfirmacao />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aluna/calendario"
        element={
          <ProtectedRoute allowedRoles={['ALUNA_FF']}>
            <Calendario />
          </ProtectedRoute>
        }
      />

      <Route
        path="/professor/chamada"
        element={
          <ProtectedRoute allowedRoles={['PROFESSOR']}>
            <Chamada />
          </ProtectedRoute>
        }
      />
      <Route
        path="/atendimentos"
        element={
          <ProtectedRoute
            allowedRoles={['PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL']}
          >
            <Atendimentos />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
