import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '@/store/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Index() {
  const { user, isAuthenticated, authLoading, login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.perfil === 'ALUNA_FF') {
        navigate('/aluna/dashboard')
      } else if (user.perfil === 'PROFESSOR') {
        navigate('/professor/chamada')
      } else if (user.perfil === 'GESTAO_GERAL') {
        navigate('/gestao/dashboard')
      } else if (user.perfil === 'ADMINISTRATIVO') {
        navigate('/admin/dashboard')
      } else if (user.perfil === 'ASSISTENTE_SOCIAL') {
        navigate('/admin/inscricoes')
      }
    }
  }, [isAuthenticated, user, navigate])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.error) {
      setError(getErrorMessage(result.error))
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <div className="flex-1 relative flex flex-col justify-center p-8 md:p-16 bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://img.usecurling.com/p/800/1200?q=martial%20arts%20women&color=black"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-xl animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-10 h-10 text-secondary" />
            <h1 className="text-2xl font-bold tracking-wider">ATKDGV</h1>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Projeto Força Feminina
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 leading-relaxed">
            Curso gratuito de defesa pessoal e empoderamento exclusivo para mulheres. Junte-se a nós
            na edição IV e descubra sua força.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-white text-lg h-14 px-8 shadow-lg"
          >
            <Link to="/inscricao">Quero me Inscrever</Link>
          </Button>
        </div>
      </div>

      <div className="w-full md:w-[450px] flex items-center justify-center p-8 bg-card shadow-[-20px_0_30px_-15px_rgba(0,0,0,0.1)] z-10 relative">
        <Card className="w-full border-none shadow-none">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Acessar Sistema</CardTitle>
            <CardDescription>
              Faça login para acompanhar sua inscrição ou gerenciar o projeto.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full h-12 text-md mt-4">
                Entrar
              </Button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground font-mono bg-muted p-3 rounded">
              <p className="font-semibold mb-1">Contas de teste (senha: Skip@Pass):</p>
              <p>andiaracaneo10@gmail.com — Admin</p>
              <p>prof@atkdgv.com — Professor</p>
              <p>aluna1@teste.com — Aluna</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
