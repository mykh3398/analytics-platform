import { OnboardingWidget } from '@/components/widgets/OnboardingWidget'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, Target, X, Inbox, ArrowRight, Pencil, Check } from 'lucide-react'
import { categoriesApi } from '@/api/categories'
import { usePermissions } from '@/lib/permissions'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

// ── Toggle ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onChange} disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-foreground' : 'bg-border'
      )}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────
type DeleteAction = 'queue' | 'transfer' | 'delete_only'

function DeleteModal({ category, otherCategories, onConfirm, onClose, isPending }: {
  category: Category
  otherCategories: Category[]
  onConfirm: (targetCategory?: string) => void
  onClose: () => void
  isPending: boolean
}) {
  const [action, setAction] = useState<DeleteAction>('queue')
  const [target, setTarget] = useState(otherCategories[0]?.name ?? '')

  const handleConfirm = () => {
    onConfirm(action === 'transfer' ? target : undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-medium text-destructive">Обережно, видалення категорії</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">«{category.name}»</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Якщо у цій категорії є повідомлення, що з ними зробити?
          </p>

          {/* Option A — queue */}
          <label className={cn(
            'flex items-start gap-3 px-4 py-3.5 rounded-lg border cursor-pointer transition-all',
            action === 'queue' ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
          )}>
            <input type="radio" className="mt-0.5 accent-current" checked={action === 'queue'} onChange={() => setAction('queue')} />
            <div className="flex items-start gap-2.5">
              <Inbox className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Повернути в чергу (Безпечно)</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Повідомлення скинуть свою розмітку і повернуться на сторінку "Навчання"
                </p>
              </div>
            </div>
          </label>

          {/* Option B — transfer */}
          <label className={cn(
            'flex items-start gap-3 px-4 py-3.5 rounded-lg border cursor-pointer transition-all',
            action === 'transfer' ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30',
            otherCategories.length === 0 && 'opacity-40 pointer-events-none'
          )}>
            <input type="radio" className="mt-0.5 accent-current" checked={action === 'transfer'} disabled={otherCategories.length === 0} onChange={() => setAction('transfer')} />
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Перенести в іншу категорію</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {otherCategories.length === 0 ? 'Немає інших категорій' : 'Всі повідомлення перейдуть у обрану категорію'}
                </p>
                {action === 'transfer' && otherCategories.length > 0 && (
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 w-full h-8 px-2 text-xs rounded-md border border-input bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {otherCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border bg-secondary/40">
          <button onClick={onClose} className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">
            Скасувати
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending || (action === 'transfer' && !target)}
            className="flex-1 h-9 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Видалити
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Row Component (Редагування інлайн) ───────────────────────
function CategoryRow({ cat, onToggle, onDelete, onRename }: {
  cat: Category;
  onToggle: (id: number) => void;
  onDelete: (cat: Category) => void;
  onRename: (id: number, name: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [isSaving, setIsSaving] = useState(false);
  const { isEditor } = usePermissions();

  const handleSave = async () => {
    if (name.trim() === cat.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onRename(cat.id, name.trim());
      setIsEditing(false);
    } catch (e: any) {
      // Помилка виводиться через toast в mutation, просто повертаємо стару назву або залишаємо поле для виправлення
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/40 transition-colors">
      <div className="flex-1 flex items-center gap-2.5">
        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setName(cat.name);
                setIsEditing(false);
              }
            }}
            className="h-8 w-full px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={isSaving}
          />
        ) : (
          <>
            <span className="text-sm">{cat.name}</span>
            {cat.isLead && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                <Target className="w-2.5 h-2.5" /> Лід
              </span>
            )}
          </>
        )}
      </div>

      {isEditor ? (
        <div className="flex items-center gap-3">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="p-1.5 rounded text-green-600 hover:text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Перейменувати"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <Toggle
                checked={cat.isLead}
                onChange={() => onToggle(cat.id)}
                disabled={isSaving}
              />
              <button
                onClick={() => onDelete(cat)}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Видалити"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        <span className={cat.isLead ? 'text-xs font-mono text-amber-600' : 'text-xs font-mono text-muted-foreground'}>
          {cat.isLead ? 'Лід' : '—'}
        </span>
      )}
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [isLead, setIsLead] = useState(false)
  const { isEditor } = usePermissions()
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })

  const create = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setName('')
      setIsLead(false)
      toast.success('Категорію створено')
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || 'Помилка створення категорії';
      toast.error(msg);
    }
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => categoriesApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Категорію перейменовано')
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || 'Помилка перейменування категорії';
      toast.error(msg);
    }
  })

  const remove = useMutation({
    mutationFn: ({ id, targetCategory }: { id: number; targetCategory?: string }) =>
      categoriesApi.delete(id, targetCategory),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setDeleteTarget(null)
      toast.success('Категорію видалено')
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || 'Помилка видалення категорії';
      toast.error(msg);
    }
  })

  const toggle = useMutation({
    mutationFn: categoriesApi.toggleLead,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['categories'] })
      const previous = qc.getQueryData<Category[]>(['categories'])
      qc.setQueryData<Category[]>(['categories'], (old = []) =>
        old.map((cat) => cat.id === id ? { ...cat, isLead: !cat.isLead } : cat)
      )
      return { previous }
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) qc.setQueryData(['categories'], context.previous)
      const msg = err.response?.data?.message || 'Помилка оновлення статусу';
      toast.error(msg);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  const otherCategories = categories.filter((c) => c.id !== deleteTarget?.id)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-medium tracking-tight">Категорії</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">
          Визначте теми повідомлень та позначте ліди
        </p>
      </div>

      {/* CSS GRID ДЛЯ ДВОКОЛОНКОВОГО LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start max-w-6xl">
        
        {/* ЛІВА КОЛОНКА (Основний контент сторінки) */}
        <div className="w-full min-w-0 space-y-6">
          
          {/* Create form — тільки EDITOR+ */}
          {isEditor && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-medium">Нова категорія</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Наприклад: Продажі, FAQ, Скарги..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name.trim() && create.mutate({ name: name.trim(), isLead } as any)}
                />
                <button
                  onClick={() => create.mutate({ name: name.trim(), lead: isLead } as any)}
                  disabled={!name.trim() || create.isPending}
                  className="h-10 px-4 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Додати
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={isLead} onChange={() => setIsLead((v) => !v)} />
                <div>
                  <p className="text-sm">Вважати лідом</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Повідомлення цієї категорії потрапляють у воронку як потенційні ліди
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-medium">Всі категорії</h2>
              <span className="text-xs text-muted-foreground font-mono">{categories.length} шт.</span>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-secondary rounded-md animate-pulse" />)}
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">Категорій ще немає. Додайте першу вище.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {categories.map((cat: Category) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    onToggle={(id) => toggle.mutate(id)}
                    onDelete={setDeleteTarget}
                    onRename={async (id, newName) => {
                      await rename.mutateAsync({ id, name: newName })
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ПРАВА КОЛОНКА (Віджет онбордингу) */}
        <div className="sticky top-6 w-full hidden lg:block">
          <OnboardingWidget />
        </div>

      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          otherCategories={otherCategories}
          isPending={remove.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(targetCategory) =>
            remove.mutate({ id: deleteTarget.id, targetCategory })
          }
        />
      )}
    </div>
  )
}