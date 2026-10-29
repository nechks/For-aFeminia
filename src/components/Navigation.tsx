import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/Logo'
import { useApp } from '@/store/app-context'
import { formatarPerfil } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  Users,
  UsersRound,
  PieChart,
  UserPlus,
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
  Camera,
  History,
  CalendarCheck,
  MapPin,
  Award,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useMinhasTurmas } from '@/components/turmas/MinhasTurmas'
import NotificacoesPopover from '@/components/NotificacoesPopover'
import { fileUrl } from '@/lib/api/client'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItem[] = [
  {
    // Administrativo e Gestão Geral veem o mesmo painel de indicadores; muda só a rota de
    // entrada de cada perfil, para o item do menu acender na página em que a pessoa está.
    title: 'Indicadores',
    href: '/admin/dashboard',
    icon: BarChart3,
    roles: ['ADMINISTRATIVO'],
  },
  {
    title: 'Inscrições',
    href: '/admin/inscricoes',
    icon: Users,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL', 'ASSISTENTE_SOCIAL'],
  },
  {
    title: '1ª Aula',
    href: '/admin/primeira-aula',
    icon: CalendarCheck,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  {
    title: 'Usuários',
    href: '/admin/usuarios',
    icon: UserCog,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  {
    // Cadastro completo de professor, assistente social ou administrativo, já aprovado.
    title: 'Cadastro de profissional',
    href: '/gestao/cadastro-profissional',
    icon: UserPlus,
    roles: ['GESTAO_GERAL'],
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
  {
    title: 'Evidências',
    href: '/gestao/evidencias',
    icon: Camera,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  {
    title: 'Histórico',
    href: '/gestao/historico-profissionais',
    icon: History,
    roles: ['GESTAO_GERAL'],
  },
  {
    title: 'Núcleos',
    href: '/gestao/nucleos',
    icon: Building2,
    roles: ['ADMINISTRATIVO', 'GESTAO_GERAL'],
  },
  { title: 'Projetos', href: '/gestao/projetos', icon: FolderKanban, roles: ['GESTAO_GERAL'] },
  {
    title: 'Municípios',
    href: '/gestao/municipios',
    icon: MapPin,
    roles: ['GESTAO_GERAL'],
  },
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
  { title: 'Autoavaliações', href: '/professor/avaliacoes', icon: Award, roles: ['PROFESSOR'] },
  {
    title: 'Evidências',
    href: '/profissional/evidencias',
    icon: Camera,
    roles: ['PROFESSOR', 'ASSISTENTE_SOCIAL'],
  },
  {
    // Gestão e Administrativo já veem estes gráficos em "Indicadores".
    title: 'Socioeconômico',
    href: '/assistente/socioeconomico',
    icon: PieChart,
    roles: ['ASSISTENTE_SOCIAL'],
  },
  {
    // Alunas das turmas em que a pessoa atua; some do menu de quem não tem vínculo com turma.
    title: 'Alunas',
    href: '/profissional/alunas',
    icon: UsersRound,
    roles: ['PROFESSOR', 'ADMINISTRATIVO', 'ASSISTENTE_SOCIAL', 'GESTAO_GERAL'],
  },
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

/**
 * As permissões da equipe valem por turma: a mesma pessoa pode ser professora numa turma e monitora
 * em outra. O item Chamada só some quando nenhum dos vínculos permite fazer chamada.
 */
function filtrarItensEquipe(
  items: NavItem[],
  perfil: string,
  podeAlgumaChamada: boolean,
  podeAvaliar: boolean,
  possuiVinculoProfissional: boolean,
): NavItem[] {
  let filtrados = items
  if (perfil !== 'ALUNA_FF' && !podeAlgumaChamada) {
    filtrados = filtrados.filter((item) => item.href !== '/professor/chamada')
  }
  if (perfil !== 'ALUNA_FF' && !podeAvaliar) {
    filtrados = filtrados.filter((item) => item.href !== '/professor/avaliacoes')
  }
  if (!possuiVinculoProfissional) {
    filtrados = filtrados.filter(
      (item) => item.href !== '/profissional/evidencias' && item.href !== '/profissional/alunas',
    )
  }
  return filtrados
}

export function Sidebar() {
  const { user, logout, authLoading, alunaLiberada } = useApp()
  const { turmas } = useMinhasTurmas()
  const location = useLocation()

  if (authLoading || !user) return null

  const filteredItems = filtrarItensEquipe(
    filtrarItensAluna(
      navItems.filter((item) => item.roles.includes(user.perfil)),
      user.perfil,
      alunaLiberada,
    ),
    user.perfil,
    turmas.some((t) => (t.chamadas_permitidas ?? []).length > 0),
    turmas.some((t) => t.tipo_profissional === 'PROFESSORA_DEFESA_PESSOAL'),
    Boolean(user.tipo_profissional || turmas.length),
  )

  return (
    <div className="hidden md:flex w-64 flex-col bg-menu text-white min-h-screen z-10 shadow-lg">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <Logo className="mr-2 h-9 w-9" />
        <span className="font-bold text-lg tracking-tight">ATKDGV</span>
      </div>
      <ScrollArea className="flex-1 py-6 px-3">
        <div className="space-y-1.5">
          {filteredItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <span
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname.startsWith(item.href)
                    ? // Ativo: pílula branca com a marca laranja à esquerda.
                      'border-l-4 border-laranja bg-white pl-2 font-semibold text-primary shadow-md shadow-black/20'
                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border-2 border-white/30">
            {user.avatar && <AvatarImage src={fileUrl(user.avatar)} alt="Foto de perfil" />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {(user.nomeSocial || user.name || '?').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">
              {user.nomeSocial || user.name || 'Usuária'}
            </span>
            <span className="text-xs text-white/70 truncate">{formatarPerfil(user.perfil)}</span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start border-white/25 bg-white/5 text-white/85 hover:bg-white/15 hover:text-white"
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
  const { turmas } = useMinhasTurmas()
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
    turmas.some((t) => (t.chamadas_permitidas ?? []).length > 0),
    turmas.some((t) => t.tipo_profissional === 'PROFESSORA_DEFESA_PESSOAL'),
    Boolean(user.tipo_profissional || turmas.length),
  )

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-card/85 backdrop-blur border-b sticky top-0 z-20 shadow-sm">
      {/* Faixa com as cores da camisa do projeto: roxo, rosa e laranja. */}
      <div className="absolute inset-x-0 top-0 h-1 bg-marca" aria-hidden />
      <div className="flex items-center md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col border-white/10 bg-menu text-white">
            <div className="h-16 flex items-center px-6 border-b border-white/10">
              <Logo className="mr-2 h-9 w-9" />
              <span className="font-bold text-lg">ATKDGV</span>
            </div>
            <div className="flex-1 py-4 px-3 space-y-1">
              {filteredItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setOpen(false)}>
                  <span
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium',
                      location.pathname.startsWith(item.href)
                        ? 'border-l-4 border-laranja bg-white pl-2 font-semibold text-primary'
                        : 'text-white/75',
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-4 px-2">
                <Avatar className="h-9 w-9 border-2 border-white/30">
                  {user.avatar && <AvatarImage src={fileUrl(user.avatar)} alt="Foto de perfil" />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(user.nomeSocial || user.name || '?').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">
                    {user.nomeSocial || user.name || 'Usuária'}
                  </span>
                  <span className="text-xs text-white/70 truncate">
                    {formatarPerfil(user.perfil)}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start border-white/25 bg-white/5 text-white/85 hover:bg-white/15 hover:text-white"
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
        <NotificacoesPopover />
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
