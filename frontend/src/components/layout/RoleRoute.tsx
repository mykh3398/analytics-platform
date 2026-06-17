import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { hasRole, ROUTE_ROLES } from '@/lib/permissions'
import type { Role } from '@/types'

function AccessDenied({ requiredRole }: { requiredRole: Role }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-lg font-medium tracking-tight mb-1">Доступ обмежено</h1>
      <p className="text-sm text-muted-foreground font-mono max-w-xs">
        Для перегляду цієї сторінки потрібна роль{' '}
        <span className="text-foreground font-medium">{requiredRole}</span> або вища.
      </p>
    </div>
  )
}

// ── Route guard ────────────────────────
/**
 * Перевіряє роль перед рендером сторінки.
 * redirect=true → перенаправляє на /dashboard
 * redirect=false (default) → показує 403 компонент
 */
export default function RoleRoute({
  path,
  children,
  redirect = false,
}: {
  path: string
  children: React.ReactNode
  redirect?: boolean
}) {
  const role = useAuthStore((s) => s.role)
  const required = ROUTE_ROLES[path] ?? 'VIEWER'

  if (!hasRole(role, required)) {
    return redirect
      ? <Navigate to="/dashboard" replace />
      : <AccessDenied requiredRole={required} />
  }

  return <>{children}</>
}