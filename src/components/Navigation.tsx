import { Link, useLocation } from 'react-router-dom'
import { useApp } from '@/store/app-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Shield,
  LayoutDashboard,
  UserCheck,
  Calendar,
  Users,
  LogOut,
  Bell,
  FileText,
  Menu,
  BarChart3,
  FileBarChart,
  UserCog,
  ClipboardList,
  CircleUser,
  Building2,
  FolderKanban,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fileUrl } from '@/lib/api/client'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItem[] = [
  {
    // Visão operacional do Administrativo; a Gestão Geral usa "Indicadores"
    // (/gestao/dashboard), que cobre os mesmos dados e mais.
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMINISTRATIVO'],
  },
  {
    title: 'Inscrições',
    href: '/admin/inscricoes',
    icon: Users,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL', 'ASSISTENTE_SOCIAL'],
  },
  {
    title: 'Usuários',
    href: '/admin/usuarios',
    icon: UserCog,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  {
    title: 'Indicadores',
    href: '/gestao/dashboard',
    icon: BarChart3,
    roles: ['GESTAO_GERAL'],
  },
  {
    title: 'Relatórios',
    href: '/relatorios',
    icon: FileBarChart,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  { title: 'Núcleos', href: '/gestao/nucleos', icon: Building2, roles: ['GESTAO_GERAL'] },
  { title: 'Projetos', href: '/gestao/projetos', icon: FolderKanban, roles: ['GESTAO_GERAL'] },
  { title: 'Meu Painel', href: '/aluna/dashboard', icon: LayoutDashboard, roles: ['ALUNA_FF'] },
  {
    title: 'Meu Perfil',
    href: '/aluna/perfil',
    icon: CircleUser,
    roles: ['ALUNA_FF', 'PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL'],
  },
  { title: 'Ficha de Confirmação', href: '/aluna/ficha', icon: FileText, roles: ['ALUNA_FF'] },
  { title: 'Calendário', href: '/aluna/calendario', icon: Calendar, roles: ['ALUNA_FF'] },
  { title: 'Chamada', href: '/professor/chamada', icon: UserCheck, roles: ['PROFESSOR'] },
  {
    title: 'Atendimentos',
    href: '/atendimentos',
    icon: ClipboardList,
    roles: ['PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL'],
  },
  {
    title: 'Alertas',
    href: '/assistente/alertas',
    icon: Bell,
    roles: ['ASSISTENTE_SOCIAL', 'ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  {
    title: 'Eventos',
    href: '/eventos',
    icon: Calendar,
    roles: ['PROFESSOR', 'ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  {
    title: 'Solicitações',
    href: '/solicitacoes',
    icon: FileText,
    roles: ['ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL'],
  },
  {
    title: 'Mural',
    href: '/admin/mural',
    icon: Bell,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
]

/**
 * Regras 2.1–2.3 do escopo: aluna sem aprovação + ficha confirmada só vê Meu Perfil e
 * Ficha de Confirmação; depois da ficha finalizada, o item Ficha some do menu.
 */
function filtrarItensAluna(items: NavItem[], perfil: string, alunaLiberada: boolean): NavItem[] {
  if (perfil !== 'ALUNA_FF') return items
  if (!alunaLiberada) {
    return items.filter((i) => i.href === '/aluna/perfil' || i.href === '/aluna/ficha')
  }
  return items.filter((i) => i.href !== '/aluna/ficha')
}

function filtrarItensEquipe(
  items: NavItem[],
  perfil: string,
  tipoProfissional?: string,
): NavItem[] {
  if (perfil === 'PROFESSOR' && tipoProfissional === 'MONITOR_CRIANCA') {
    return items.filter((item) => item.href !== '/professor/chamada')
  }
  return items
}

export function Sidebar() {
  const { user, logout, authLoading, alunaLiberada } = useApp()
  const location = useLocation()

  if (authLoading || !user) return null

  const filteredItems = filtrarItensEquipe(
    filtrarItensAluna(
      navItems.filter((item) => item.roles.includes(user.perfil)),
      user.perfil,
      alunaLiberada,
    ),
    user.perfil,
    user.tipo_profissional,
  )

  return (
    <div className="hidden md:flex w-64 flex-col bg-card border-r min-h-screen z-10 shadow-sm">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <Shield className="w-6 h-6 text-primary mr-2" />
        <span className="font-bold text-lg text-primary tracking-tight">ATKDGV</span>
      </div>
      <ScrollArea className="flex-1 py-6 px-3">
        <div className="space-y-1.5">
          {filteredItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <span
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border">
            {user.avatar && <AvatarImage src={fileUrl(user.avatar)} alt="Foto de perfil" />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {(user.nomeSocial || user.name || '?').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">
              {user.nomeSocial || user.name || 'Usuária'}
            </span>
            <span className="text-xs text-muted-foreground truncate">{user.perfil ?? '—'}</span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  )
}

export function TopHeader() {
  const { user, authLoading, logout, alunaLiberada } = useApp()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  if (authLoading || !user) return null
  const filteredItems = filtrarItensEquipe(
    filtrarItensAluna(
      navItems.filter((item) => item.roles.includes(user.perfil)),
      user.perfil,
      alunaLiberada,
    ),
    user.perfil,
    user.tipo_profissional,
  )

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-card border-b sticky top-0 z-20 shadow-sm">
      <div className="flex items-center md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-border/50">
              <Shield className="w-6 h-6 text-primary mr-2" />
              <span className="font-bold text-lg text-primary">ATKDGV</span>
            </div>
            <div className="flex-1 py-4 px-3 space-y-1">
              {filteredItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setOpen(false)}>
                  <span
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium',
                      location.pathname.startsWith(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center gap-3 mb-4 px-2">
                <Avatar className="h-9 w-9 border">
                  {user.avatar && <AvatarImage src={fileUrl(user.avatar)} alt="Foto de perfil" />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(user.nomeSocial || user.name || '?').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">
                    {user.nomeSocial || user.name || 'Usuária'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.perfil ?? '—'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  setOpen(false)
                  logout()
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-bold ml-2 text-primary">Força Feminina</span>
      </div>

      <div className="hidden md:flex items-center">
        <span className="font-semibold text-muted-foreground">Projeto Força Feminina IV</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
          <Bell className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground rounded-full"
          onClick={logout}
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
