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
import { FichaInscricaoFF, StatusInscricao, Usuario } from '@/lib/types'
import { getInscricoes, createInscricao, updateStatus } from '@/services/ficha-inscricao'

interface AppState {
  user: Usuario | null
  isAuthenticated: boolean
  authLoading: boolean
  inscricoes: FichaInscricaoFF[]
  login: (email: string, password: string) => Promise<{ error: any }>
  signUp: (name: string, email: string, password: string) => Promise<{ error: any }>
  logout: () => void
  addInscricao: (data: Partial<FichaInscricaoFF>) => Promise<{ error: any }>
  updateInscricaoStatus: (
    id: string,
    status: StatusInscricao,
    extraData?: Record<string, unknown>,
  ) => Promise<{ error: any }>
  submitFichaConfirmacao: (userId: string, data: Record<string, unknown>) => Promise<{ error: any }>
  refreshInscricoes: () => Promise<void>
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, signIn, signOut, signUp, isAuthenticated, loading: authLoading } = useAuth()
  const [inscricoes, setInscricoes] = useState<FichaInscricaoFF[]>([])

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
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadInscricoes()
  }, [loadInscricoes])

  useRealtime(
    'ficha_inscricao_ff',
    () => {
      loadInscricoes()
    },
    isAuthenticated,
  )

  const login = async (email: string, password: string) => signIn(email, password)
  const logout = () => signOut()
  const handleSignUp = async (name: string, email: string, password: string) =>
    signUp(name, email, password)

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
    _extraData?: Record<string, unknown>,
  ) => {
    try {
      await updateStatus(id, status)
      await loadInscricoes()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const submitFichaConfirmacao = async (_userId: string, _data: Record<string, unknown>) => {
    return { error: null }
  }

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
      refreshInscricoes: loadInscricoes,
    }),
    [user, isAuthenticated, authLoading, inscricoes, loadInscricoes],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
