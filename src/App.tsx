import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider, useApp } from '@/store/app-context'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Inscricao from './pages/Inscricao'
import AdminDashboard from './pages/admin/AdminDashboard'
import DashboardAluna from './pages/aluna/DashboardAluna'
import FichaConfirmacao from './pages/aluna/FichaConfirmacao'
import Chamada from './pages/professor/Chamada'

// Protected Route Wrapper
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) => {
  const { user } = useApp()
  if (!user) return <Navigate to="/" replace />
  if (!allowedRoles.includes(user.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

const AppRoutes = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Index />} />
      <Route path="/inscricao" element={<Inscricao />} />

      {/* Admin Routes */}
      <Route
        path="/admin/inscricoes"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'GESTAO']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Aluna Routes */}
      <Route
        path="/aluna/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ALUNA_FF']}>
            <DashboardAluna />
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

      {/* Professor Routes */}
      <Route
        path="/professor/chamada"
        element={
          <ProtectedRoute allowedRoles={['PROFESSOR']}>
            <Chamada />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AppProvider>
  </BrowserRouter>
)

export default App
