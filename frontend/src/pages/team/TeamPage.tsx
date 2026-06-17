import { OnboardingWidget } from '@/components/widgets/OnboardingWidget'

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

const ROLES: Role[] = ['VIEWER', 'EDITOR', 'OWNER']

const ROLE_BADGE: Record<Role, string> = {
  OWNER:  'text-amber-700 bg-amber-50 border-amber-200',
  EDITOR: 'text-blue-700 bg-blue-50 border-blue-200',
  VIEWER: 'text-muted-foreground bg-secondary border-border',
}

// ── Add member modal (OWNER only) ─────────────────────────────────────
function AddMemberModal({ workspaceId, onClose }: {
  workspaceId: string; onClose: () => void
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
  })

  const errMsg = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message ?? 'Перевірте email та спробуйте знову.'

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
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
            <input
              autoFocus type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email && mutate()}
              placeholder="user@company.com"
              className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Роль</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs text-muted-foreground font-mono mt-1.5">
              {role === 'VIEWER' && 'Тільки перегляд аналітики'}
              {role === 'EDITOR' && 'Аналітика + розмітка повідомлень'}
              {role === 'OWNER'  && 'Повний доступ, управління командою'}
            </p>
          </div>
          {isError && <p className="text-xs text-destructive font-mono">{errMsg}</p>}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border bg-secondary/30">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">
            Скасувати
          </button>
          <button onClick={() => mutate()} disabled={isPending || !email.trim()}
            className="flex-1 h-9 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Додати
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Team page ─────────────────────────────────────────────────────────
export default function TeamPage() {
  const qc = useQueryClient()
  const { isOwner } = usePermissions()
  const currentUser        = useAuthStore((s) => s.user)
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId)
  const [showModal, setShowModal] = useState(false)

  const wsId    = currentWorkspaceId ?? ''
  const wsIdNum = wsId ? Number(wsId) : null

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', wsIdNum],
    queryFn: () => membersApi.getAll(wsIdNum!),
    enabled: !!wsIdNum && wsIdNum > 0,
  })

  const ownerCount = members.filter((m) => m.role === 'OWNER').length
  const isLastOwner = (m: Member) => m.role === 'OWNER' && ownerCount <= 1
  const isSelf = (m: Member) =>
    String(m.id) === String(currentUser?.id) || m.email === currentUser?.email

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: Role }) => {
      if (!memberId || !wsIdNum) return Promise.reject(new Error('invalid params'))
      return membersApi.updateRole(wsIdNum, memberId, role)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', wsIdNum] }); toast.success('Роль оновлено') },
    onError: () => toast.error('Не вдалося змінити роль'),
  })

  const remove = useMutation({
    mutationFn: (memberId: number) => {
      if (!memberId || !wsIdNum) return Promise.reject(new Error('invalid params'))
      return membersApi.remove(wsIdNum, memberId)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', wsIdNum] }); toast.success('Учасника видалено') },
    onError: () => toast.error('Не вдалося видалити учасника'),
  })

  return (
    <div className="p-6">
      
      {/* ВЕРХНЯ ЧАСТИНА (ЗАГОЛОВОК) */}
      <div className="mb-6">
        <h1 className="text-lg font-medium tracking-tight">Команда</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">
          Учасники поточного робочого простору
          {!isOwner && ' — режим перегляду'}
        </p>
      </div>

      {/* CSS GRID ДЛЯ ДВОКОЛОНКОВОГО LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start max-w-6xl">
        
        {/* ЛІВА КОЛОНКА (Основний контент сторінки) */}
        <div className="w-full min-w-0 space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-medium">Учасники</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{members.length} шт.</span>
                {isOwner && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 h-7 px-2.5 bg-foreground text-background rounded-md text-xs font-medium hover:opacity-85 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Додати
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-14 bg-secondary rounded-md animate-pulse" />)}
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">Учасників немає</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((member) => {
                  const self      = isSelf(member)
                  const lastOwner = isLastOwner(member)
                  const canEdit   = isOwner && !(self && lastOwner)
                  const canRemove = isOwner && !self

                  return (
                    <li key={member.id} className="flex items-center gap-3 px-5 py-3.5">
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
                          {self && <span className="text-[10px] text-muted-foreground font-mono">(ви)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{member.email}</p>
                      </div>

                      {/* Role */}
                      {canEdit ? (
                        <select
                          value={member.role}
                          disabled={updateRole.isPending}
                          onChange={(e) => {
                            const newRole = e.target.value as Role
                            if (self && newRole !== 'OWNER' && lastOwner) {
                              toast.error('Ви єдиний власник — призначте іншого OWNER спочатку')
                              return
                            }
                            updateRole.mutate({ memberId: Number(member.id), role: newRole })
                          }}
                          className="h-7 px-2 text-xs rounded-md border border-input bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1', ROLE_BADGE[member.role])}>
                          <ShieldAlert className="w-2.5 h-2.5" />
                          {member.role}
                        </span>
                      )}

                      {/* Remove or spacer */}
                      {canRemove ? (
                        <button
                          onClick={() => remove.mutate(Number(member.id))}
                          disabled={remove.isPending && remove.variables === Number(member.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 shrink-0"
                          title="Видалити учасника"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        </div>

        {/* ПРАВА КОЛОНКА (Віджет онбордингу) */}
        <div className="sticky top-6 w-full hidden lg:block">
          <OnboardingWidget />
        </div>
      </div>

      {showModal && wsIdNum && (
        <AddMemberModal workspaceId={String(wsIdNum)} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}