import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Tag, BookOpen, LogOut, Wifi, Settings, ShieldAlert, Users } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/lib/permissions'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

const ROLE_BADGE: Record<Role, { label: string; class: string }> = {
  OWNER:  { label: 'Owner',  class: 'text-amber-700 bg-amber-50 border-amber-200' },
  EDITOR: { label: 'Editor', class: 'text-blue-700 bg-blue-50 border-blue-200'   },
  VIEWER: { label: 'Viewer', class: 'text-muted-foreground bg-secondary border-border' },
}

const ALL_NAV = [
  { to: '/dashboard',  label: 'Дашборд',      icon: BarChart3, minRole: 'VIEWER' as Role },
  { to: '/team',       label: 'Простір',       icon: Users,     minRole: 'VIEWER' as Role },
  { to: '/training',   label: 'Навчання',      icon: BookOpen,  minRole: 'EDITOR' as Role },
  { to: '/categories', label: 'Категорії',     icon: Tag,       minRole: 'EDITOR' as Role },
  { to: '/sources',    label: 'Джерела',       icon: Wifi,      minRole: 'OWNER'  as Role },
  { to: '/settings',   label: 'Налаштування',  icon: Settings,  minRole: 'EDITOR' as Role },
]

export default function AppLayout() {
  const { user, logout }  = useAuthStore()
  const { role, can }     = usePermissions()
  const navigate          = useNavigate()

  const visibleNav = ALL_NAV.filter((item) => can(item.minRole))
  const badge      = role ? ROLE_BADGE[role] : null

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-secondary/40">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border shrink-0">
          <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-background" />
          </div>
          <span className="text-sm font-medium tracking-tight">Pulse</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border pb-1">
          <div className="pt-2">
            <WorkspaceSwitcher />
          </div>

          <div className="border-t border-border mx-3 mb-1" />

          <div className="px-3 py-2">
            <p className="text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{user?.email}</p>
            {badge && (
              <span className={cn(
                'inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full border',
                badge.class
              )}>
                <ShieldAlert className="w-2.5 h-2.5" />
                {badge.label}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-6 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Вийти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}