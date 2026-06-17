import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import type { LoginRequest, RegisterRequest } from '@/types'
import { authApi } from '@/api/auth'
import { CheckCircle2 } from 'lucide-react'

// ── Brand panel ───────────────────────────────────────────────────────
function BrandPanel() {
  const bars = [
    { label: 'Telegram', pct: 82, count: '1,842' },
    { label: 'Instagram', pct: 54, count: '1,203' },
    { label: 'Viber', pct: 31, count: '691' },
    { label: 'WhatsApp', pct: 19, count: '427' },
  ]

  return (
    <div className="hidden lg:flex lg:w-[420px] flex-col justify-between p-10 bg-secondary border-r border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-background" />
        </div>
        <div>
          <p className="text-sm font-medium tracking-tight">Pulse Analytics</p>
          <p className="text-xs text-muted-foreground font-mono">messenger intelligence</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-muted-foreground font-mono">активність за 7 днів</p>
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{b.label}</span>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-foreground/40 rounded-full" style={{ width: `${b.pct}%` }} />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">{b.count}</span>
          </div>
        ))}

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono mb-3">воронка</p>
          <div className="flex items-end gap-2 h-10">
            {[100, 72, 48, 28].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-foreground rounded-sm rounded-b-none"
                style={{ height: `${h}%`, opacity: 0.15 + i * 0.12 }}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            {['звернення', 'клас.', 'лід', 'обробка'].map((l) => (
              <span key={l} className="flex-1 text-[10px] text-muted-foreground font-mono">{l}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground font-mono leading-relaxed">
        NLP-класифікація повідомлень<br />
        з усіх каналів у реальному часі
      </p>
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────────────
function Field({ label, type, placeholder, value, onChange }: {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        className="w-full h-10 px-3 rounded-md border border-input bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// ── Login form ────────────────────────────────────────────────────────
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate()
  const { login, isLoading, error } = useAuthStore()
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' })

  const handleSubmit = async () => {
    try {
      await login(form)
      navigate('/dashboard')
    } catch {
      // помилка вже в store.error
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Email" type="email" placeholder="you@company.com" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />

      {/* Обгортка для пароля та посилання */}
      <div className="space-y-1">
        <Field label="Пароль" type="password" placeholder="••••••••" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Забули пароль?
          </button>
        </div>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full h-10 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Увійти
      </button>

      <p className="text-center text-xs text-muted-foreground font-mono pt-2">
        Немає акаунту?{' '}
        <button onClick={onSwitch} className="text-foreground underline underline-offset-2">
          Зареєструватись
        </button>
      </p>
    </div>
  )
}

// ── Register form ─────────────────────────────────────────────────────
function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [form, setForm] = useState<RegisterRequest>({
    firstName: '', lastName: '', email: '', password: '', companyName: '',
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false) // Новий стейт для успіху

  const set = (key: keyof RegisterRequest) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Викликаємо API напряму
      await authApi.register(form)
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Помилка реєстрації')
    } finally {
      setIsLoading(false)
    }
  }

  // Якщо реєстрація успішна — показуємо банер замість форми
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h3 className="text-xl font-bold text-foreground">Майже готово!</h3>
        <p className="text-sm text-muted-foreground">
          Ми надіслали лист для підтвердження на <span className="font-medium text-foreground">{form.email}</span>.<br/>
          Будь ласка, перейдіть за посиланням у листі, щоб активувати акаунт.
        </p>
        <button 
          onClick={onSwitch} 
          className="mt-4 h-10 px-4 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors"
        >
          Повернутися до входу
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ім'я"    type="text" placeholder="Іван"     value={form.firstName} onChange={set('firstName')} />
        <Field label="Прізвище" type="text" placeholder="Петренко" value={form.lastName}  onChange={set('lastName')}  />
      </div>
      <Field label="Email"           type="email"    placeholder="you@company.com"  value={form.email}       onChange={set('email')}       />
      <Field label="Пароль"          type="password" placeholder="мін. 6 символів"  value={form.password}    onChange={set('password')}    />
      <Field label="Назва компанії"  type="text"     placeholder="Acme LLC"         value={form.companyName} onChange={set('companyName')} />

      {error && <p className="text-destructive text-xs bg-destructive/10 p-2 rounded">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full h-10 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-85 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Створити акаунт
      </button>

      <p className="text-center text-xs text-muted-foreground font-mono pt-1">
        Вже є акаунт?{' '}
        <button onClick={onSwitch} className="text-foreground underline underline-offset-2">
          Увійти
        </button>
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
type Tab = 'login' | 'register'

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-4xl flex shadow-sm border border-border rounded-xl overflow-hidden">
        <BrandPanel />

        <div className="flex-1 flex flex-col justify-center px-8 py-10 bg-card min-h-[560px]">
          <div className="flex border-b border-border mb-7">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 mr-6 text-sm transition-colors border-b-2 -mb-px ${tab === t
                    ? 'text-foreground font-medium border-foreground'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
              >
                {t === 'login' ? 'Вхід' : 'Реєстрація'}
              </button>
            ))}
          </div>

          {tab === 'login'
            ? <LoginForm onSwitch={() => setTab('register')} />
            : <RegisterForm onSwitch={() => setTab('login')} />
          }
        </div>
      </div>
    </div>
  )
}