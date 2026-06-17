import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, Check, Loader2, X, Building2 } from 'lucide-react'
import { workspacesApi } from '@/api/workspaces'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

const ROLE_COLORS: Record<Role, string> = {
  OWNER: 'text-amber-600',
  EDITOR: 'text-blue-600',
  VIEWER: 'text-muted-foreground',
}

// ── Create modal ──────────────────────────────────────────────────────
function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace)
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (n: string) => workspacesApi.create(n),
    onSuccess: (ws) => {
      // 1. Закрити модалку
      onClose()
      // 2. Оновити список просторів
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      // 3. Переключити store (SYNC — до invalidateQueries)
      const newId = Number((ws as unknown as Record<string, unknown>)?.id)
      if (newId) {
        const updatedUser = user
          ? { ...user, workspaceRoles: { ...(user.workspaceRoles ?? {}), [String(newId)]: 'OWNER' as Role } }
          : user
        useAuthStore.setState({ user: updatedUser })
        switchWorkspace(newId)
          ;['heatmap', 'funnel', 'topics', 'categories', 'pending-messages',
            'training-history', 'model-status', 'workspace-settings']
            .forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      }
      toast.success(`Простір «${(ws as { name?: string })?.name ?? name}» створено`)
    },
    onError: () => toast.error('Помилка при створенні простору'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium">Новий простір</h2>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Назва
          </label>
          <input
            autoFocus type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && mutate(name.trim())}
            placeholder="Наприклад: Мій бізнес..."
            className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isError && <p className="text-xs text-destructive font-mono mt-2">Помилка. Спробуйте знову.</p>}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border bg-secondary/30">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-all">
            Скасувати
          </button>
          <button onClick={() => name.trim() && mutate(name.trim())}
            disabled={isPending || !name.trim()}
            className="flex-1 h-9 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 flex items-center justify-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Створити
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Workspace Switcher ────────────────────────────────────────────────
export default function WorkspaceSwitcher() {
  const qc = useQueryClient()
  const { currentWorkspaceId, switchWorkspace } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Закрити при кліку поза компонентом
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.getAll,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="px-3 mb-1">
        <div className="h-9 bg-secondary animate-pulse rounded-md" />
      </div>
    )
  }

  const rawData = data as any
  let workspaces: { id: number; name: string; role?: Role }[] = []

  if (Array.isArray(rawData)) {
    workspaces = rawData.map((item: any) => ({
      id: item.workspaceId,
      name: item.workspaceName,
      role: item.role
    }))
  } else if (rawData && typeof rawData === 'object' && Array.isArray(rawData.content)) {
    workspaces = rawData.content.map((item: any) => ({
      id: item.workspaceId,
      name: item.workspaceName,
      role: item.role
    }))
  }

  const current = workspaces.find((w) => Number(w.id) === Number(currentWorkspaceId))
    ?? workspaces[0]
    ?? null

  if (current && !currentWorkspaceId) {
    switchWorkspace(current.id)
  }

  const currentName = current?.name ?? 'Простір'

  const handleSwitch = (id: number) => {
    switchWorkspace(id)
    setOpen(false)
    qc.clear()
  }

  const renderWorkspaceItem = (ws: { id: number; name: string; role?: Role }) => {
    const isActive = Number(ws.id) === Number(currentWorkspaceId)
    return (
      <button
        key={ws.id}
        onClick={() => handleSwitch(ws.id)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors',
          isActive && 'bg-accent'
        )}
      >
        <div className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
          {ws.name?.charAt(0) ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{ws.name}</p>
          {ws.role && (
            <p className={cn('text-[10px] font-mono', ROLE_COLORS[ws.role] ?? 'text-muted-foreground')}>
              {ws.role}
            </p>
          )}
        </div>
        {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
      </button>
    )
  }

  return (
    <>
      <div ref={ref} className="relative px-3 mb-1">
        {/* Trigger button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
        >
          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate flex-1"> {currentName}</span>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 bottom-full mb-1 bg-card border border-border rounded-xl shadow-lg z-40 overflow-hidden">
            
            {/* Workspace list з групами та кастомним скролом */}
            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
              {workspaces.length > 0 ? (
                <>
                  {workspaces.filter(ws => ws.role === 'OWNER').length > 0 && (
                    <div className="px-3 py-1.5 mt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Мої простори
                      </p>
                    </div>
                  )}
                  {workspaces
                    .filter(ws => ws.role === 'OWNER')
                    .map(ws => renderWorkspaceItem(ws))}

                  {workspaces.filter(ws => ws.role !== 'OWNER').length > 0 && (
                    <div className="px-3 py-1.5 mt-2 border-t border-border/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Гостьові простори
                      </p>
                    </div>
                  )}
                  {workspaces
                    .filter(ws => ws.role !== 'OWNER')
                    .map(ws => renderWorkspaceItem(ws))}
                </>
              ) : (
                <p className="text-xs text-muted-foreground font-mono px-3 py-4 text-center">
                  Немає доступних просторів
                </p>
              )}
            </div>

            {/* Create button */}
            <div className="border-t border-border">
              {(() => {
                const ownedCount = workspaces.filter(ws => ws.role === 'OWNER').length
                const hasReachedLimit = ownedCount >= 3

                return (
                  <button
                    onClick={() => { setOpen(false); setShowCreate(true) }}
                    disabled={hasReachedLimit}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      Створити новий простір
                    </div>
                    {hasReachedLimit && (
                      <span className="text-[10px] text-red-500 font-medium">Ліміт: 3</span>
                    )}
                  </button>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </>
  )
}