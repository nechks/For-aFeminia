import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, TopHeader } from './Navigation'
import { useApp } from '@/store/app-context'

export default function Layout() {
  const { user } = useApp()
  const location = useLocation()

  const isPublicRoute = location.pathname === '/' || location.pathname === '/inscricao'

  if (isPublicRoute && !user) {
    return (
      <main className="min-h-screen bg-background flex flex-col animate-fade-in">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-4 md:p-8 animate-fade-in overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
