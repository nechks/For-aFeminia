import { createContext, useContext, useState, ReactNode, useMemo } from 'react'
import { Usuario, FichaInscricaoFF, PerfilUsuario, Presenca, StatusInscricao } from '@/lib/types'
import { toast } from '@/components/ui/use-toast'

interface AppState {
  user: Usuario | null
  inscricoes: FichaInscricaoFF[]
  presencas: Presenca[]
  login: (email: string, perfil: PerfilUsuario) => void
  logout: () => void
  addInscricao: (inscricao: Omit<FichaInscricaoFF, 'id' | 'status' | 'dataCriacao'>) => void
  updateInscricaoStatus: (id: string, status: StatusInscricao, dataPrimeiraAula?: string) => void
  submitFichaConfirmacao: (alunaId: string, data: any) => void
}

const mockUsers: Usuario[] = [
  { id: '1', nomeCompleto: 'Admin Silva', email: 'admin@atkdgv.com', perfil: 'ADMIN', ativo: true },
  {
    id: '2',
    nomeCompleto: 'Professora Manuela',
    email: 'prof@atkdgv.com',
    perfil: 'PROFESSOR',
    ativo: true,
  },
  {
    id: '3',
    nomeCompleto: 'Aluna Aprovada',
    email: 'aluna1@teste.com',
    perfil: 'ALUNA_FF',
    ativo: true,
  },
  {
    id: '4',
    nomeCompleto: 'Aluna Nova',
    email: 'aluna2@teste.com',
    perfil: 'ALUNA_FF',
    ativo: true,
  },
]

const initialInscricoes: FichaInscricaoFF[] = [
  {
    id: '101',
    usuarioId: '3',
    turma: 'CENTRO_VITORIA',
    nomeCompleto: 'Aluna Aprovada',
    dataNascimento: '1995-05-10',
    cpf: '111.111.111-11',
    telefone: '27999999999',
    cep: '29000-000',
    rua: 'Rua A',
    numero: '10',
    bairro: 'Centro',
    cidade: 'Vitória',
    autorizaLgpd: true,
    status: 'APROVADA',
    dataPrimeiraAula: '2026-06-13',
    dataCriacao: '2026-06-01',
    fichaConfirmacaoPreenchida: false,
  },
  {
    id: '102',
    usuarioId: '4',
    turma: 'AEST_SERRA',
    nomeCompleto: 'Aluna Nova',
    dataNascimento: '2000-01-01',
    cpf: '222.222.222-22',
    telefone: '27988888888',
    cep: '29100-000',
    rua: 'Rua B',
    numero: '20',
    bairro: 'Manguinhos',
    cidade: 'Serra',
    autorizaLgpd: true,
    status: 'AGUARDANDO',
    dataCriacao: '2026-06-02',
  },
]

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [inscricoes, setInscricoes] = useState<FichaInscricaoFF[]>(initialInscricoes)
  const [presencas, setPresencas] = useState<Presenca[]>([])

  const login = (email: string, perfil: PerfilUsuario) => {
    const found = mockUsers.find((u) => u.email === email)
    if (found) {
      setUser(found)
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vinda, ${found.nomeCompleto}`,
      })
    } else {
      // Simulate creating a user if they login with a non-mocked email just for testing
      const newUser: Usuario = {
        id: Math.random().toString(),
        nomeCompleto: 'Usuário Teste',
        email,
        perfil,
        ativo: true,
      }
      setUser(newUser)
    }
  }

  const logout = () => {
    setUser(null)
    toast({ title: 'Logout realizado' })
  }

  const addInscricao = (data: Omit<FichaInscricaoFF, 'id' | 'status' | 'dataCriacao'>) => {
    const newInscricao: FichaInscricaoFF = {
      ...data,
      id: Math.random().toString(36).substring(7),
      status: 'AGUARDANDO',
      dataCriacao: new Date().toISOString(),
    }
    setInscricoes((prev) => [...prev, newInscricao])
  }

  const updateInscricaoStatus = (
    id: string,
    status: StatusInscricao,
    dataPrimeiraAula?: string,
  ) => {
    setInscricoes((prev) => prev.map((i) => (i.id === id ? { ...i, status, dataPrimeiraAula } : i)))
  }

  const submitFichaConfirmacao = (alunaId: string, data: any) => {
    setInscricoes((prev) =>
      prev.map((i) =>
        i.usuarioId === alunaId ? { ...i, fichaConfirmacaoPreenchida: true, ...data } : i,
      ),
    )
  }

  const value = useMemo(
    () => ({
      user,
      inscricoes,
      presencas,
      login,
      logout,
      addInscricao,
      updateInscricaoStatus,
      submitFichaConfirmacao,
    }),
    [user, inscricoes, presencas],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
