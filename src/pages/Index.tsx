import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '@/store/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PerfilUsuario } from '@/lib/types'
import { Shield } from 'lucide-react'

export default function Index() {
  const { login, user } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PerfilUsuario>('ALUNA_FF')

  // Auto redirect if already logged in
  if (user) {
    if (user.perfil === 'ADMIN') navigate('/admin/inscricoes')
    else if (user.perfil === 'ALUNA_FF') navigate('/aluna/dashboard')
    else if (user.perfil === 'PROFESSOR') navigate('/professor/chamada')
    return null
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      login(email, role)
      if (role === 'ADMIN') navigate('/admin/inscricoes')
      else if (role === 'ALUNA_FF') navigate('/aluna/dashboard')
      else if (role === 'PROFESSOR') navigate('/professor/chamada')
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Hero Section */}
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
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-white text-lg h-14 px-8 shadow-lg"
            >
              <Link to="/inscricao">Quero me Inscrever</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Login Section */}
      <div className="w-full md:w-[450px] flex items-center justify-center p-8 bg-card shadow-[-20px_0_30px_-15px_rgba(0,0,0,0.1)] z-10 relative">
        <Card className="w-full border-none shadow-none">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Acessar Sistema</CardTitle>
            <CardDescription>
              Faça login para acompanhar sua inscrição ou gerenciar o projeto.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={handleLogin} className="space-y-4">
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
                <label className="text-sm font-medium">Perfil (Simulação)</label>
                <Select value={role} onValueChange={(v) => setRole(v as PerfilUsuario)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALUNA_FF">Aluna (Força Feminina)</SelectItem>
                    <SelectItem value="PROFESSOR">Professor(a)</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input type="password" placeholder="••••••••" required className="h-12" />
              </div>
              <Button type="submit" className="w-full h-12 text-md mt-4">
                Entrar
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Dicas para teste mock:</p>
              <p className="mt-1 font-mono text-xs text-left bg-muted p-2 rounded">
                admin@atkdgv.com (Admin)
                <br />
                prof@atkdgv.com (Professor)
                <br />
                aluna1@teste.com (Aluna Aprovada)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
