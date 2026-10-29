import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AppProvider, useApp } from '@/store/app-context'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Inscricao from './pages/Inscricao'
import CadastroProfessor from './pages/CadastroProfessor'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminInscricoes from './pages/admin/AdminInscricoes'
import PrimeiraAula from './pages/admin/PrimeiraAula'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import MuralManagement from './pages/admin/MuralManagement'
import DashboardAluna from './pages/aluna/DashboardAluna'
import PerfilAluna from './pages/aluna/PerfilAluna'
import FichaConfirmacao from './pages/aluna/FichaConfirmacao'
import Calendario from './pages/aluna/Calendario'
import Chamada from './pages/professor/Chamada'
import Avaliacoes from './pages/professor/Avaliacoes'
import Atendimentos from './pages/professor/Atendimentos'
import RegistroAulaPage from './pages/profissional/RegistroAulaPage'
import AlunasPage from './pages/profissional/AlunasPage'
import PerfilSocioeconomico from './pages/assistente/PerfilSocioeconomico'
import Alertas from './pages/assistente/Alertas'
import Eventos from './pages/eventos/Eventos'
import Solicitacoes from './pages/solicitacoes/Solicitacoes'
import GestaoDashboard from './pages/gestao/GestaoDashboard'
import Relatorios from './pages/gestao/Relatorios'
import Nucleos from './pages/gestao/Nucleos'
import NucleoDetalhe from './pages/gestao/NucleoDetalhe'
import Projetos from './pages/gestao/Projetos'
import MunicipiosAtendidos from './pages/gestao/MunicipiosAtendidos'
import HistoricoProfissionais from './pages/gestao/HistoricoProfissionais'
import Evidencias from './pages/gestao/Evidencias'
import { useEffect, useState } from 'react'
import { getNucleosPublicos } from '@/services/nucleos'
import { turmaLabels, nucleosCadastrados, NUCLEOS_PADRAO } from '@/lib/constants'

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
      <Route path="/cadastro-professor" element={<CadastroProfessor />} />

      <Route
        path="/admin/inscricoes"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL', 'ASSISTENTE_SOCIAL']}>
            <AdminInscricoes />
          </ProtectedRoute>
        }
      />
      {/* Fila do fluxo pós-ficha: define a data da 1ª aula e avisa a aluna. */}
      <Route
        path="/admin/primeira-aula"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <PrimeiraAula />
          </ProtectedRoute>
        }
      />
      {/* Administrativo e Gestão Geral veem o mesmo painel de indicadores. */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <GestaoDashboard />
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
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <GestaoDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <Relatorios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/nucleos"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <Nucleos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/nucleos/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <NucleoDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/projetos"
        element={
          <ProtectedRoute allowedRoles={['GESTAO_GERAL']}>
            <Projetos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/municipios"
        element={
          <ProtectedRoute allowedRoles={['GESTAO_GERAL']}>
            <MunicipiosAtendidos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/historico-profissionais"
        element={
          <ProtectedRoute allowedRoles={['GESTAO_GERAL']}>
            <HistoricoProfissionais />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/evidencias"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <Evidencias />
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
        path="/professor/avaliacoes"
        element={
          <ProtectedRoute allowedRoles={['PROFESSOR']}>
            <Avaliacoes />
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
      <Route
        path="/profissional/evidencias"
        element={
          <ProtectedRoute
            allowedRoles={['PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL']}
          >
            <RegistroAulaPage tipo="EVIDENCIA" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestao/cadastro-profissional"
        element={
          <ProtectedRoute allowedRoles={['GESTAO_GERAL']}>
            <CadastroProfessor modo="gestao" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistente/socioeconomico"
        element={
          <ProtectedRoute allowedRoles={['ASSISTENTE_SOCIAL', 'ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <PerfilSocioeconomico />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profissional/alunas"
        element={
          <ProtectedRoute
            allowedRoles={['PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL']}
          >
            <AlunasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistente/alertas"
        element={
          <ProtectedRoute allowedRoles={['ASSISTENTE_SOCIAL', 'ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <Alertas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/eventos"
        element={
          <ProtectedRoute allowedRoles={['PROFESSOR', 'ADMINISTRATIVO', 'GESTAO_GERAL']}>
            <Eventos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/solicitacoes"
        element={
          <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL']}>
            <Solicitacoes />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

/**
 * Carrega os nomes dos núcleos vindos do backend sobre os rótulos padrão de
 * `turmaLabels`. Os rótulos são cosméticos e já têm valores de fallback, então
 * o app renderiza de imediato: bloquear aqui (`return null`) deixava a tela
 * totalmente branca durante toda a requisição — e indefinidamente quando o
 * backend estava reiniciando.
 *
 * `<AppRoutes />` é criado aqui dentro (em vez de recebido via `children`) para
 * que o `setVersion` re-renderize a árvore e os rótulos novos apareçam, sem
 * remontar as rotas nem refazer as requisições das páginas.
 */
function NucleosBootstrap() {
  const [, setVersion] = useState(0)
  useEffect(() => {
    // Os rótulos são públicos e necessários antes e depois do login. Usar o endpoint
    // administrativo aqui gerava 403 no perfil da aluna durante o preenchimento da ficha.
    getNucleosPublicos()
      .then((ns) => {
        if (!Array.isArray(ns)) return
        // Os nomes padrão permanecem como base: quando nenhum núcleo está cadastrado, apagá-los
        // fazia a tela exibir o código técnico (ex.: `AEST_SERRA`) nas inscrições antigas.
        Object.keys(turmaLabels).forEach((codigo) => delete turmaLabels[codigo])
        Object.assign(turmaLabels, NUCLEOS_PADRAO)
        // O endpoint público já devolve somente núcleos ativos e, por privacidade, não
        // expõe o campo `ativo`. Filtrar essa propriedade inexistente esvaziava todos os rótulos.
        ns.forEach((n) => {
          turmaLabels[n.codigo] = n.nome
        })
        // Lista para os seletores: só o que existe de fato no backend.
        nucleosCadastrados.length = 0
        nucleosCadastrados.push(...ns.map((n) => ({ codigo: n.codigo, nome: n.nome })))
        setVersion((v) => v + 1)
      })
      .catch((err) => {
        console.error('Falha ao carregar núcleos; usando rótulos padrão.', err)
      })
  }, [])
  return <AppRoutes />
}

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <NucleosBootstrap />
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
)

export default App
