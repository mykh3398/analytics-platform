import { useToastStore } from '@/store/toast'
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  error:   AlertCircle,
  success: CheckCircle2,
  info:    Info,
}

const STYLES = {
  error:   'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-green-200 bg-green-50 text-green-800',
  info:    'border-border bg-card text-foreground',
}

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md text-sm transition-all',
              STYLES[t.type]
            )}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}