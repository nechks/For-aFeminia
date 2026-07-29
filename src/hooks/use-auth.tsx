import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api, { authStore } from '@/lib/api/client'
import { Usuario, PerfilUsuario } from '@/lib/types'

interface AuthContextType {
  user: Usuario | null
  isAuthenticated: boolean
  loading: boolean
  signUp: (name: string, email: string, password: string, perfil?: PerfilUsuario, turma?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(authStore.user)
  const [isAuthenticated, setIsAuthenticated] = useState(authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authStore.onChange((_token, record) => {
      setUser(record)
      setIsAuthenticated(authStore.isValid)
    })
    if (authStore.isValid) {
      api
        .get<Usuario>('/api/auth/me')
        .then((me) => authStore.setUser(me))
        .catch(() => authStore.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (name: string, email: string, password: string, perfil: PerfilUsuario = 'ALUNA_FF', turma?: string) => {
    try {
      await api.post('/api/auth/register', { name, email, password, perfil, turma: turma ?? null })
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await api.post<{ token: string; user: Usuario }>('/api/auth/login', {
        email,
        password,
      })
      authStore.save(result.token, result.user)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    authStore.clear()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
