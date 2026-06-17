import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  BarChart3, Send, Camera, MessageCircle, Phone,
  Loader2, ChevronRight, Sparkles, CheckCircle2
} from 'lucide-react'
import { sourcesApi, detectSourceType } from '@/api/sources'
import type { SourceType, CreateSourceRequest } from '@/types'
import { cn } from '@/lib/utils'

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

// ── Source option config ──────────────────────────────────────────────
const SOURCE_OPTIONS: { type: SourceType; label: string; icon: React.ElementType; placeholder: string; hint: string }[] = [
  {
    type: 'TELEGRAM',
    label: 'Telegram',
    icon: Send,
    placeholder: '1234567890:AAFabcdefghijklmnopqrstuvwxyz12345',
    hint: 'Bot API токен — @BotFather → /newbot',
  },
  {
    type: 'INSTAGRAM',
    label: 'Instagram',
    icon: Camera,
    placeholder: 'EAABsbCS...',
    hint: 'Page Access Token — Meta Business Suite',
  },
  {
    type: 'VIBER',
    label: 'Viber',
    icon: MessageCircle,
    placeholder: 'xxxxxxxxxxxxxxxx-xxxxxxxx-xxxxxxxx',
    hint: 'Auth Token — Viber Admin Panel',
  },
  {
    type: 'WHATSAPP',
    label: 'WhatsApp',
    icon: Phone,
    placeholder: 'EAABsbCS...',
    hint: 'Business API Token — Meta Business Suite',
  },
]

// ── Detected badge ────────────────────────────────────────────────────
function DetectedBadge({ type }: { type: SourceType }) {
  const src = SOURCE_OPTIONS.find((s) => s.type === type)!
  const Icon = src.icon
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
      <Sparkles className="w-3 h-3" />
      Визначено: <Icon className="w-3 h-3" /> {src.label}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function SetupPage() {
  const navigate = useNavigate()
  
  const [token, setToken] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [manualType, setManualType] = useState<SourceType | ''>('')
  const [detected, setDetected] = useState<ReturnType<typeof detectSourceType> | null>(null)
  const [done, setDone] = useState(false)

  // Стани валідації
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [instanceIdError, setInstanceIdError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const resolvedType = (detected?.type ?? manualType) as SourceType | ''
  const isMeta = ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'].includes(resolvedType)

  // Auto-detect and validate token
  useEffect(() => {
    if (token.length > 5) {
      const result = detectSourceType(token)
      setDetected(result)
      
      if (result.type && !manualType) {
        setManualType(result.type)
      }

      // Визначаємо правило валідації
      const activeType = result.type || manualType
      let validationKey = activeType || 'FALLBACK'
      if (['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'].includes(activeType as string)) {
         validationKey = 'META_TOKEN'
      }
      
      setTokenError(validateInput(token, validationKey))
    } else {
      setDetected(null)
      setTokenError(null)
    }
    setServerError(null)
  }, [token, manualType])

  // Validate instanceId (Page ID for Meta)
  useEffect(() => {
     if (isMeta && instanceId.length > 0) {
        setInstanceIdError(validateInput(instanceId, 'META_PAGE_ID'))
     } else {
        setInstanceIdError(null)
     }
     setServerError(null)
  }, [instanceId, isMeta])

  // Кнопка активна тільки якщо все заповнено і немає помилок
  const isValid = resolvedType && token && instanceId && !tokenError && !instanceIdError

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateSourceRequest) => sourcesApi.create(data),
    onSuccess: () => {
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 1400)
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status
      const msg    = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (status === 400) {
        setServerError(msg ?? 'Цей токен вже підключено до іншого акаунту')
      } else {
        setServerError('Помилка підключення. Перевірте дані та спробуйте знову.')
      }
    },
  })

  const handleSubmit = () => {
    if (!isValid) return
    mutate({ 
      type: resolvedType, 
      instanceId: instanceId.trim(), 
      token: token.trim(), 
      label: instanceId.trim() 
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-background" />
        </div>
        <span className="text-base font-medium tracking-tight">Pulse Analytics</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-border">
          <h1 className="text-lg font-medium tracking-tight">Додати перше джерело</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Вставте токен — платформа визначиться автоматично
          </p>
        </div>

        {/* Form */}
        <div className="px-7 py-6 space-y-5">
          
          {/* Token input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isMeta ? 'Page Access Token' : 'Токен / Ідентифікатор'}
              </label>
              {detected?.type && <DetectedBadge type={detected.type} />}
            </div>
            <input
              type="text"
              className={cn(
                "w-full h-10 px-3 rounded-md border bg-secondary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-shadow",
                tokenError ? "border-destructive focus:ring-destructive/30" : "border-input"
              )}
              placeholder="Вставте токен..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            {tokenError && (
              <p className="text-xs text-destructive font-mono mt-1.5 flex items-center gap-1.5">
                <span>⚠</span> {tokenError}
              </p>
            )}
          </div>

          {/* Manual type selector — shown only when not auto-detected */}
          {!detected?.type && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Або оберіть вручну
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SOURCE_OPTIONS.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => setManualType(type)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs transition-all',
                      manualType === type
                        ? 'border-foreground bg-foreground text-background shadow-sm'
                        : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hint for selected type */}
          {resolvedType && (
            <p className="text-xs text-muted-foreground font-mono bg-secondary px-3 py-2 rounded-md border border-border">
              {SOURCE_OPTIONS.find((s) => s.type === resolvedType)?.hint}
            </p>
          )}

          {/* Instance ID (або Page ID для Meta) */}
          {resolvedType && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {isMeta ? 'Page ID (Ідентифікатор сторінки)' : 'Назва інстансу'}
              </label>
              <input
                type="text"
                className={cn(
                  "w-full h-10 px-3 rounded-md border bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow",
                  instanceIdError ? "border-destructive focus:ring-destructive/30" : "border-input",
                  isMeta ? "font-mono" : ""
                )}
                placeholder={isMeta ? "10123456789" : "наприклад: sales, support, main"}
                value={instanceId}
                onChange={(e) => {
                  const val = e.target.value
                  // Якщо Meta - залишаємо лише цифри. Інакше - форматуємо в slug
                  setInstanceId(isMeta ? val.replace(/\D/g, '') : val.toLowerCase().replace(/\s+/g, '-'))
                }}
              />
              {instanceIdError ? (
                <p className="text-xs text-destructive font-mono mt-1.5 flex items-center gap-1.5">
                  <span>⚠</span> {instanceIdError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {isMeta 
                    ? 'Унікальний числовий ID сторінки Facebook/Instagram' 
                    : 'Унікальна назва для ідентифікації каналу в аналітиці'
                  }
                </p>
              )}
            </div>
          )}

          {/* Backend Error */}
          {serverError && (
             <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
               <p className="text-xs text-destructive font-mono leading-relaxed">
                 ⚠ {serverError}
               </p>
             </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isPending || done || !isValid}
            className="w-full h-10 mt-2 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 active:scale-[0.99] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Підключено! Переходимо...
              </>
            ) : isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Підключення...
              </>
            ) : (
              <>
                Підключити джерело
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 bg-secondary/40 border-t border-border text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            Пропустити → налаштую пізніше
          </button>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mt-8">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-medium">✓</div>
          <span>Акаунт</span>
        </div>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
          <div className="w-5 h-5 rounded-full border-2 border-foreground flex items-center justify-center text-[10px]">2</div>
          <span>Джерело</span>
        </div>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px]">3</div>
          <span>Дашборд</span>
        </div>
      </div>
    </div>
  )
}