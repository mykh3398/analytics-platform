import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2, Loader2, X, ShieldAlert } from 'lucide-react'
import { membersApi } from '@/api/members'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/lib/permissions'
import { toast } from '@/store/toast'
import type { Role } from '@/types'
import type { Member } from '@/api/members'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────
const ROLES: Role[] = ['VIEWER', 'EDITOR', 'OWNER']

const ROLE_BADGE: Record<Role, string> = {
  OWNER:  'text-amber-700 bg-amber-50 border-amber-200',
  EDITOR: 'text-blue-700 bg-blue-50 border-blue-200',
  VIEWER: 'text-muted-foreground bg-secondary border-border',
}

// ── Add member modal ──────────────────────────────────────────────────
function AddMemberModal({ workspaceId, onClose }: {
  workspaceId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState<Role>('VIEWER')

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => membersApi.add(workspaceId, { email: email.trim(), role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', workspaceId] })
      toast.success(`${email} додано до простору`)
      onClose()
    },
    onError: () => {},
  })

  const errMsg = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message ?? 'Помилка. Перевірте email та спробуйте знову.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium">Додати учасника</h2>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email && mutate()}
              placeholder="user@company.com"
              className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Роль
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground font-mono mt-1.5">
              {role === 'VIEWER'  && 'Тільки перегляд аналітики'}
              {role === 'EDITOR'  && 'Аналітика + розмітка повідомлень'}
              {role === 'OWNER'   && 'Повний доступ, управління учасниками'}
            </p>
          </div>

          {isError && (
            <p className="text-xs text-destructive font-mono">{errMsg}</p>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border bg-secondary/30">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
          >
            Скасувати
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !email.trim()}
            className="flex-1 h-9 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Додати
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Members tab ───────────────────────────────────────────────────────
export default function MembersTab() {
  const qc                 = useQueryClient()
  
  const { canManageTeam, isOwner } = usePermissions()
  const currentUser        = useAuthStore((s) => s.user)
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId)
  const [showModal, setShowModal] = useState(false)

  const wsId = currentWorkspaceId ?? ''

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => membersApi.getAll(wsId),
    enabled: !!wsId,
  })

  const ownerCount = members.filter((m) => m.role === 'OWNER').length
  const isLastOwner = (m: Member) =>
    m.role === 'OWNER' && ownerCount <= 1

  const isSelf = (m: Member) =>
    String(m.id) === String(currentUser?.id) ||
    m.email === currentUser?.email

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: Role }) => {
      if (!memberId) return Promise.reject(new Error('memberId is undefined'))
      return membersApi.updateRole(wsId, memberId, role)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', wsId] })
      toast.success('Роль оновлено')
    },
    onError: () => toast.error('Не вдалося змінити роль'),
  })

  const remove = useMutation({
    mutationFn: (memberId: number) => {
      if (!memberId) return Promise.reject(new Error('memberId is undefined'))
      return membersApi.remove(wsId, memberId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', wsId] })
      toast.success('Учасника видалено')
    },
    onError: () => toast.error('Не вдалося видалити учасника'),
  })

  const canEditMember = (m: Member) => {
    if (!canManageTeam) return false            
    if (isSelf(m) && isLastOwner(m)) return false  
    return true
  }

  const canRemoveMember = (m: Member) => {
    if (!canManageTeam) return false
    if (isSelf(m)) return false             
    return true
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-secondary rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-mono">
          {members.length} учасників у просторі
        </p>
        {isOwner && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-8 px-3 bg-foreground text-background rounded-md text-xs font-medium hover:opacity-85 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Додати учасника
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden w-full">
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">Учасників немає</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const editable  = canEditMember(member)
              const removable = canRemoveMember(member)
              const self      = isSelf(member)
              const lastOwner = isLastOwner(member)

              return (
                <li key={member.id} className="flex items-center gap-3 px-5 py-3.5 w-full">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 text-xs font-medium uppercase">
                    {member.firstName?.[0] ?? member.email[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {member.firstName} {member.lastName}
                      </p>
                      {self && (
                        <span className="text-[10px] text-muted-foreground font-mono">(ви)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {member.email}
                    </p>
                  </div>

                  {/* Role — editable select або badge */}
                  {editable ? (
                    <select
                      value={member.role}
                      disabled={updateRole.isPending}
                      onChange={(e) => {
                        const newRole = e.target.value as Role
                        // Захист: OWNER не може знизити себе якщо він єдиний
                        if (self && newRole !== 'OWNER' && lastOwner) {
                          toast.error('Ви єдиний власник — спочатку призначте іншого OWNER')
                          return
                        }
                        updateRole.mutate({ memberId: Number(member.id), role: newRole })
                      }}
                      className="h-7 px-2 text-xs rounded-md border border-input bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={cn(
                      'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                      ROLE_BADGE[member.role]
                    )}>
                      <ShieldAlert className="w-2.5 h-2.5 inline mr-1" />
                      {member.role}
                    </span>
                  )}

                  {/* Remove */}
                  {removable ? (
                    <button
                      onClick={() => remove.mutate(Number(member.id))}
                      disabled={remove.isPending && remove.variables === Number(member.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 shrink-0"
                      title="Видалити учасника"
                    >
                      {remove.isPending && remove.variables === Number(member.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                          <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-7 shrink-0" /> 
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddMemberModal workspaceId={wsId} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}