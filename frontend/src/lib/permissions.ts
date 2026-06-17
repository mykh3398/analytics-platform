import type { Role } from '@/types'
import { useAuthStore } from '@/store/auth'

// ── Ієрархія ─────────────────────────────────────────────────────────
const ROLE_RANK: Record<Role, number> = {
  OWNER:  3,
  EDITOR: 2,
  VIEWER: 1,
}

export function hasRole(current: Role | null, required: Role): boolean {
  if (!current) return false
  return ROLE_RANK[current] >= ROLE_RANK[required]
}

// ── Матриця маршрутів ─────────────────────────────────────────────────
export const ROUTE_ROLES: Record<string, Role> = {
  '/dashboard':  'VIEWER',   
  '/team':       'VIEWER',   
  '/training':   'EDITOR',   
  '/categories': 'EDITOR',   
  '/sources':    'VIEWER',   
  '/settings':   'EDITOR',   
}

// ── Хук ──────────────────────────────────────────────────────────────
export function usePermissions() {
  const role               = useAuthStore((s) => s.role)
  const user               = useAuthStore((s) => s.user)
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId)

  const derivedRole: Role = (() => {
    const wsRoles = user?.workspaceRoles
    if (!wsRoles || !currentWorkspaceId) return role ?? 'VIEWER'
    return (wsRoles[String(currentWorkspaceId)] as Role | undefined) ?? role ?? 'VIEWER'
  })()

  const isOwner = hasRole(derivedRole, 'OWNER')
  const isEditor = hasRole(derivedRole, 'EDITOR')
  const isViewer = hasRole(derivedRole, 'VIEWER')

  return {
    // 1. Базові статуси ролей
    role: derivedRole,
    isOwner,
    isEditor,
    isViewer,
    can: (required: Role) => hasRole(derivedRole, required),

    // 2. Деталізовані права доступу (згідно з технічним завданням)
    
    // OWNER
    canManageWorkspace: isOwner,  // Зміна назви та видалення робочого простору
    canManageSources: isOwner,    // Додавання та видалення джерел інтеграції
    canManageTeam: isOwner,       // Призначення ролей та видалення учасників
    canManageApiKeys: isOwner,    // Створення системного API-ключа

    // EDITOR + OWNER
    canManageModel: isEditor,     // Зміна базової NLP-моделі
    canCopyApiKey: isEditor,      // Копіювання API-ключа
    canManageCategories: isEditor,// Створення, редагування, видалення категорій
    canAnnotateData: isEditor,    // Перегляд повідомлень та ручна розмітка
    canRetrainModel: isEditor,    // Ініціація адаптації алгоритму класифікації

    // VIEWER + EDITOR + OWNER
    canViewTeam: isViewer,        // Перегляд списку учасників
    canViewSources: isViewer,     // Перегляд підключених джерел
    canViewDashboard: isViewer,   // Перегляд дашборду, трендів та завантаження графіків
  }
}