import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Loader2, Send, Camera,
  MessageCircle, Phone, Globe,
  Sparkles, X, Wifi, WifiOff, AlertCircle,
} from 'lucide-react'
import { sourcesApi, detectSourceType } from '@/api/sources'
import { usePermissions } from '@/lib/permissions'
import type { Source, SourceType, CreateSourceRequest } from '@/types'
import { cn } from '@/lib/utils'

// ІМПОРТ ВІДЖЕТУ ОНБОРДИНГУ
import { OnboardingWidget } from '@/components/widgets/OnboardingWidget'

// ── РЕГУЛЯРНІ ВИРАЗИ ДЛЯ ВАЛІДАЦІЇ ────────────────────────────────────
const VALIDATION_RULES: Record<string, { regex: RegExp; errorMsg: string }> = {
  TELEGRAM: {
    regex: /^[0-9]+:[a-zA-Z0-9_-]+$/,
    errorMsg: 'Невірний формат. Очікується: 1234567890:ABCdef...',
  },
  VIBER: {
    regex: /^[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+$/,
    errorMsg: 'Невірний формат. Очікується: xxxxxxxx-xxxxxxxx-xxxxxxxx',
  },
  META_TOKEN: {
    regex: /^EAA[a-zA-Z0-9]+$/,
    errorMsg: 'Токен Meta має починатися з EAA та містити лише літери/цифри.',
  },
  META_PAGE_ID: {
    regex: /^[0-9]{10,25}$/,
    errorMsg: 'Page ID має містити лише цифри (10-25 символів).',
  },
  FALLBACK: {
    regex: /^[a-zA-Z0-9_-]{15,}$/,
    errorMsg: 'Токен має містити лише літери, цифри або дефіси (мін. 15 символів).',
  }
}

function validateInput(value: string, type: string): string | null {
  if (!value.trim()) return null;
  const rule = VALIDATION_RULES[type] || VALIDATION_RULES.FALLBACK;
  if (!rule.regex.test(value.trim())) {
    return rule.errorMsg;
  }
  return null;
}

// ── Platform config ───────────────────────────────────────────────────
const SOURCE_CONFIG: Record<SourceType, {
  label: string
  icon: React.ElementType
  color: string
  hint: string
  fields: 'telegram' | 'meta'
}> = {
  TELEGRAM: {
    label: 'Telegram',
    icon: Send,
    color: 'text-sky-500',
    hint: 'Bot API токен — @BotFather → /newbot',
    fields: 'telegram',
  },
  INSTAGRAM: {
    label: 'Instagram',
    icon: Camera,
    color: 'text-pink-500',
    hint: 'Page ID та Access Token генеруються у панелі розробника Meta (App Dashboard)',
    fields: 'meta',
  },
  FACEBOOK: {
    label: 'Facebook',
    icon: Globe,
    color: 'text-blue-600',
    hint: 'Page ID та Access Token генеруються у панелі розробника Meta (App Dashboard)',
    fields: 'meta',
  },
  VIBER: {
    label: 'Viber',
    icon: MessageCircle,
    color: 'text-violet-500',
    hint: 'Auth Token — Viber Admin Panel',
    fields: 'telegram', 
  },
  WHATSAPP: {
    label: 'WhatsApp',
    icon: Phone,
    color: 'text-green-500',
    hint: 'Page ID та Access Token генеруються у панелі розробника Meta (App Dashboard)',
    fields: 'meta',
  },
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Активне', icon: Wifi, class: 'text-green-600 bg-green-50 border-green-200' },
  INACTIVE: { label: 'Неактивне', icon: WifiOff, class: 'text-muted-foreground bg-secondary border-border' },
  ERROR: { label: 'Помилка', icon: AlertCircle, class: 'text-red-600 bg-red-50 border-red-200' },
}

// ── Field component ───────────────────────────────────────────────────
function FormField({ label, value, onChange, placeholder, mono = false, error }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  mono?: boolean
  error?: string | null
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type="text"
        className={cn(
          'w-full h-10 px-3 rounded-md border bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
          mono && 'font-mono',
          error ? 'border-destructive focus:ring-destructive/30' : 'border-input'
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p className="text-xs text-destructive font-mono mt-1.5 flex items-center gap-1.5">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

// ── Source card ───────────────────────────────────────────────────────
function SourceCard({ source, onDelete, isDeleting, isOwner }: {
  source: Source
  onDelete: (id: string) => void
  isDeleting: boolean
  isOwner: boolean
}) {
  const cfg = SOURCE_CONFIG[source.type]
  const Icon = cfg.icon
  const status = STATUS_CONFIG[source.status]
  const StatusIcon = status.icon

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Icon className={cn('w-4 h-4', cfg.color)} />
          </div>
          <div className="min-w-0">
            {/* ТЕПЕР ВІДОБРАЖАЄТЬСЯ source.label */}
            <p className="text-sm font-medium truncate" title={source.label || cfg.label}>
              {source.label || cfg.label}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
              <span>{cfg.label}</span>
              <span>•</span>
              <span className="truncate" title={source.instanceId}>{source.instanceId}</span>
            </div>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(source.id)}
            disabled={isDeleting}
            className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          'flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border',
          status.class
        )}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono">
          {new Date(source.createdAt).toLocaleDateString('uk-UA')}
        </span>
      </div>
    </div>
  )
}

// ── Add source modal ──────────────────────────────────────────────────
function AddSourceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  // Спільні поля
  const [selectedType, setSelectedType] = useState<SourceType | null>(null)
  const [label, setLabel] = useState('')

  // Стани помилок
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [pageIdError, setPageIdError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Telegram / Viber — одне поле
  const [token, setToken] = useState('')
  const [detected, setDetected] = useState<ReturnType<typeof detectSourceType> | null>(null)

  // Meta — два поля
  const [pageId, setPageId] = useState('')
  const [accessToken, setAccessToken] = useState('')

  // Автодетекція та валідація токена (Telegram/Viber)
  useEffect(() => {
    // 1. Автодетекція типу (тільки якщо введено достатньо символів)
    let currentType = selectedType;
    if (token.length > 5) {
      const result = detectSourceType(token);
      setDetected(result);
      if (result.type && !selectedType) {
        setSelectedType(result.type);
        currentType = result.type;
      }
    } else {
      setDetected(null);
    }

    // 2. ВАЛІДАЦІЯ (працює завжди, якщо є хоч 1 символ)
    if (token.length > 0) {
      const validationType = currentType || 'FALLBACK';
      setTokenError(validateInput(token, validationType));
    } else {
      setTokenError(null); // Якщо поле порожнє — не підсвічуємо помилку
    }

    setServerError(null);
  }, [token, selectedType]);

  // Валідація Meta Page ID
  useEffect(() => {
    if (pageId.length > 0) {
      setPageIdError(validateInput(pageId, 'META_PAGE_ID'));
    } else {
      setPageIdError(null);
    }
    setServerError(null);
  }, [pageId]);

  // Валідація Meta Access Token
  useEffect(() => {
    if (accessToken.length > 0) {
      setTokenError(validateInput(accessToken, 'META_TOKEN'));
    } else {
      setTokenError(null);
    }
    setServerError(null);
  }, [accessToken]);

  // При зміні платформи — скидаємо поля
  const handleTypeSelect = (type: SourceType) => {
    setSelectedType(type)
    setToken('')
    setPageId('')
    setAccessToken('')
    setTokenError(null)
    setPageIdError(null)
    setServerError(null)
    setDetected(null)
  }

  const cfg = selectedType ? SOURCE_CONFIG[selectedType] : null
  const isMeta = cfg?.fields === 'meta'

  // Валідація всієї форми
  const isValid = selectedType && label && (
    isMeta ? (pageId && accessToken && !tokenError && !pageIdError) : (token && !tokenError)
  )

  // Збираємо payload залежно від платформи
  function buildPayload(): CreateSourceRequest {
    if (isMeta) {
      return {
        type: selectedType!,
        instanceId: pageId.trim(),
        token: accessToken.trim(),
        label: label.trim(),
      }
    }
    return {
      type: selectedType!,
      instanceId: token.trim(),   // для Telegram/Viber дублюємо токен як instanceId
      token: token.trim(),
      label: label.trim(),
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateSourceRequest) => sourcesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      onClose()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (status === 400) {
        setServerError(msg ?? 'Цей токен вже підключено до іншого акаунту')
      } else {
        setServerError('Помилка підключення. Перевірте дані та спробуйте знову.')
      }
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium">Додати джерело</h2>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Platform picker */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Платформа
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(SOURCE_CONFIG) as [SourceType, typeof SOURCE_CONFIG[SourceType]][]).map(([type, c]) => {
                const Icon = c.icon
                const isSelected = selectedType === type
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs transition-all',
                      isSelected
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Telegram / Viber: одне поле токена ── */}
          {selectedType && !isMeta && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Bot Token
                </label>
                {detected?.type && (
                  <span className="flex items-center gap-1.5 text-xs font-mono text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    {SOURCE_CONFIG[detected.type].label}
                  </span>
                )}
              </div>
              <input
                type="text"
                className={cn(
                  'w-full h-10 px-3 rounded-md border bg-secondary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  tokenError ? 'border-destructive focus:ring-destructive/30' : 'border-input'
                )}
                placeholder={selectedType === 'TELEGRAM'
                  ? '1234567890:AAFabcdefghijklmnopqrstuvwxyz12345'
                  : 'xxxxxxxxxxxxxxxx-xxxxxxxx-xxxxxxxx'
                }
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoFocus
              />
              {tokenError && (
                <p className="text-xs text-destructive font-mono mt-1.5 flex items-center gap-1.5">
                  <span>⚠</span> {tokenError}
                </p>
              )}
            </div>
          )}

          {/* ── Meta (Instagram / WhatsApp / Facebook): два поля ── */}
          {selectedType && isMeta && (
            <div className="space-y-4">
              <FormField
                label="Page ID"
                value={pageId}
                onChange={(val: string) => setPageId(val.replace(/\D/g, ''))} // Дозволяємо лише цифри
                placeholder="10123456789"
                mono
                error={pageIdError}
              />
              <FormField
                label="Page Access Token"
                value={accessToken}
                onChange={setAccessToken}
                placeholder="EAABsbCS..."
                mono
                error={tokenError}
              />
            </div>
          )}

          {/* Hint */}
          {cfg && (
            <p className="text-xs text-muted-foreground font-mono bg-secondary px-3 py-2 rounded-md border border-border leading-relaxed">
              {cfg.hint}
            </p>
          )}

          {/* Instance label */}
          {selectedType && (
            <FormField
              label="Назва інстансу"
              value={label}
              onChange={(v) => setLabel(v.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="sales, support, main..."
            />
          )}

          {/* Backend Error */}
          {serverError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mt-2">
              <p className="text-xs text-destructive font-mono leading-relaxed">
                ⚠ {serverError}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border bg-secondary/40">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
          >
            Скасувати
          </button>
          <button
            onClick={() => isValid && mutate(buildPayload())}
            disabled={isPending || !isValid}
            className="flex-1 h-9 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Підключити
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function SourcesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const { canManageSources } = usePermissions() // Використовуємо canManageSources замість isOwner

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: sourcesApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: sourcesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  })

  return (
    <div className="p-6">

      {/* 🚀 CSS GRID ДЛЯ ДВОКОЛОНКОВОГО LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start max-w-6xl">

        {/* ЛІВА КОЛОНКА (Основний контент сторінки) */}
        <div className="w-full min-w-0 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium tracking-tight">Джерела</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                Підключені колектори повідомлень
              </p>
            </div>
            {/* Кнопка додавання джерела доступна лише OWNER */}
            {canManageSources && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 h-9 px-4 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 transition-all"
              >
                <Plus className="w-4 h-4" />
                Додати джерело
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-secondary animate-pulse rounded-xl" />)}
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Немає підключених джерел</p>
              {canManageSources ? (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Натисніть «Додати джерело» щоб підключити перший канал
                </p>
              ) : (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Тільки власник простору може додавати джерела
                </p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === source.id}
                  isOwner={canManageSources} // Видаляти можуть тільки ті, хто має права canManageSources
                />
              ))}
            </div>
          )}
        </div>

        {/* ПРАВА КОЛОНКА (Віджет онбордингу) */}
        <div className="sticky top-6 w-full hidden lg:block">
          <OnboardingWidget />
        </div>

      </div>

      {showModal && canManageSources && <AddSourceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}