import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
} from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { FichaInscricaoFF, PerfilUsuario, StatusInscricao, Usuario } from '@/lib/types'
import { getInscricoes, createInscricao, updateStatus } from '@/services/ficha-inscricao'
import { getMinhaConfirmacao, submitConfirmacao } from '@/services/ficha-confirmacao'

interface AppState {
  user: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean
  inscricoes: FichaInscricaoFF[]
  login: (email: string, password: string) => Promise<{ error: any }>
  signUp: (name: string, email: string, password: string, perfil?: PerfilUsuario, turma?: string) => Promise<{ error: any }>
  logout: () => void
  addInscricao: (data: Partial<FichaInscricaoFF>) => Promise<{ error: any }>
  updateInscricaoStatus: (
    id: string,
    status: StatusInscricao,
    extraData?: Record<string, unknown>,
  ) => Promise<{ error: any }>
  submitFichaConfirmacao: (formData: FormData) => Promise<{ error: any }>
  minhaConfirmacao: any
  /** Inscrição da própria aluna (para ALUNA_FF a listagem retorna apenas a dela). */
  minhaInscricao: FichaInscricaoFF | null
  /**
   * Painel completo liberado somente com inscrição APROVADA e ficha de confirmação
   * preenchida (regra 2.2 do escopo).
   */
  alunaLiberada: boolean
  /** Indica que os dados necessários para decidir o gating da aluna já foram carregados. */
  alunaGateReady: boolean
  refreshInscricoes: () => Promise<void>
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, signIn, signOut, signUp, isAuthenticated, loading: authLoading } = useAuth()
  const [inscricoes, setInscricoes] = useState<FichaInscricaoFF[]>([])
  const [minhaConfirmacao, setMinhaConfirmacao] = useState<any>(null)
  const [inscricoesLoaded, setInscricoesLoaded] = useState(false)
  const [confirmacaoLoaded, setConfirmacaoLoaded] = useState(false)

  const loadInscricoes = useCallback(async () => {
    if (!isAuthenticated) {
      setInscricoes([])
      return
    }
    try {
      const records = await getInscricoes()
      setInscricoes(records as unknown as FichaInscricaoFF[])
    } catch (err) {
      console.error('Failed to load inscricoes:', err)
    } finally {
      setInscricoesLoaded(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadInscricoes()
  }, [loadInscricoes])

  const loadMinhaConfirmacao = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setMinhaConfirmacao(null)
      return
    }
    try {
      const result = await getMinhaConfirmacao(user.id)
      setMinhaConfirmacao(result)
    } catch {
      setMinhaConfirmacao(null)
    } finally {
      setConfirmacaoLoaded(true)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    loadMinhaConfirmacao()
  }, [loadMinhaConfirmacao])

  useRealtime(
    'ficha_inscricao_ff',
    () => {
      loadInscricoes()
    },
    isAuthenticated,
  )

  useRealtime(
    'ficha_confirmacao_ff',
    () => {
      loadMinhaConfirmacao()
    },
    isAuthenticated,
  )

  const login = async (email: string, password: string) => signIn(email, password)
  const logout = () => signOut()
  const handleSignUp = async (name: string, email: string, password: string, perfil?: PerfilUsuario, turma?: string) =>
    signUp(name, email, password, perfil, turma)

  const addInscricao = async (data: Partial<FichaInscricaoFF>) => {
    try {
      await createInscricao({ ...data, user_id: user?.id })
      await loadInscricoes()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updateInscricaoStatus = async (
    id: string,
    status: StatusInscricao,
    extraData?: Record<string, unknown>,
  ) => {
    try {
      await updateStatus(id, status, extraData)
      await loadInscricoes()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const submitFichaConfirmacao = async (formData: FormData) => {
    try {
      await submitConfirmacao(formData)
      await loadMinhaConfirmacao()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const minhaInscricao = user?.perfil === 'ALUNA_FF' ? (inscricoes[0] ?? null) : null
  const alunaLiberada =
    user?.perfil === 'ALUNA_FF'
      ? minhaInscricao?.status === 'APROVADA' && !!minhaConfirmacao
      : true
  const alunaGateReady =
    user?.perfil !== 'ALUNA_FF' || (inscricoesLoaded && confirmacaoLoaded)

  const value = useMemo<AppState>(
    () => ({
      user,
      isAuthenticated,
      authLoading,
      inscricoes,
      login,
      signUp: handleSignUp,
      logout,
      addInscricao,
      updateInscricaoStatus,
      submitFichaConfirmacao,
      minhaConfirmacao,
      minhaInscricao,
      alunaLiberada,
      alunaGateReady,
      refreshInscricoes: loadInscricoes,
    }),
    [user, isAuthenticated, authLoading, inscricoes, minhaConfirmacao, minhaInscricao, alunaLiberada, alunaGateReady, loadInscricoes],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
