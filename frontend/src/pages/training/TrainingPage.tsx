import { OnboardingWidget } from '@/components/widgets/OnboardingWidget'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { workspaceApi } from '@/api/workspace'
import { categoriesApi } from '@/api/categories'
import { toast } from '@/store/toast'
import type { ModelStatusResponse, RetrainResponse } from '@/types'
import {
  Brain, RefreshCw, Loader2, CheckCircle2, Circle,
  AlertCircle, Inbox, History, Target, BarChart, Percent
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
interface PendingMsg {
  id: number
  text: string
  source: string
  sentAt: string
}

interface HistoryItem {
  messageId: number
  text: string
  category: string
  source: string
  classifiedAt: string   // замінено annotatedAt → classifiedAt
  isManual: boolean      // true = ручна розмітка, false = NLP auto
  confidence: number     // 0.0 – 1.0
  isExample: boolean
}

interface SpringPage<T> {
  content: T[]
  totalPages: number
  totalElements: number
  first: boolean
  last: boolean
}

interface Filters {
  source: string
  category: string
  startDate: string
  endDate: string
}

const EMPTY_FILTERS: Filters = { source: '', category: '', startDate: '', endDate: '' }

// ─────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────
function buildParams(page: number, size: number, f: Filters) {
  return {
    page,
    size,
    ...(f.source ? { source: f.source } : {}),
    ...(f.category ? { category: f.category } : {}),
    ...(f.startDate ? { startDate: f.startDate } : {}),
    ...(f.endDate ? { endDate: f.endDate } : {}),
  }
}

function toSpringPage<T>(raw: unknown): SpringPage<T> {
  if (raw && typeof raw === 'object' && 'content' in (raw as object)) {
    return raw as SpringPage<T>
  }
  const items = Array.isArray(raw) ? (raw as T[]) : []
  return { content: items, totalPages: 1, totalElements: items.length, first: true, last: true }
}

const trainingApi = {
  modelStatus: () =>
    api.get<ModelStatusResponse>('/training/status').then((r) => r.data),

  retrain: () =>
    api.post<RetrainResponse>('/training/retrain').then((r) => r.data),

  getSources: () =>
    api.get<string[]>('/training/sources').then((r) =>
      Array.isArray(r.data) ? r.data : []
    ),

  getPending: (page: number, size: number, f: Filters) =>
    api
      .get<unknown>('/training/pending', { params: buildParams(page, size, f) })
      .then((r) => toSpringPage<PendingMsg>(r.data)),

  getHistory: (page: number, size: number, f: Filters) =>
    api
      .get<unknown>('/training/history', { params: buildParams(page, size, f) })
      .then((r) => toSpringPage<HistoryItem>(r.data)),

  annotate: (messageId: number, category: string, isPositive: boolean) =>
    api.post('/training/annotate', { messageId, category, isPositive }).then((r) => r.data),
}

// ─────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────

/** Панель фільтрів (однакова для обох колонок) */
function FilterPanel({ filters, sources, categories, onChange, onReset }: {
  filters: Filters
  sources: string[]
  categories: { id: number; name: string }[]
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}) {
  const hasActive = Object.values(filters).some(Boolean)
  const fmt = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

  return (
    <div className="px-4 py-2.5 border-b border-border bg-secondary/30 space-y-2">
      <div className="flex gap-2">
        <select
          value={filters.source}
          onChange={(e) => onChange({ source: e.target.value })}
          className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Всі джерела</option>
          {sources.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
        </select>

        <select
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Всі категорії</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={filters.startDate}
          max={filters.endDate || undefined}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground shrink-0">—</span>
        <input
          type="date"
          value={filters.endDate}
          min={filters.startDate || undefined}
          onChange={(e) => onChange({ endDate: e.target.value })}
          className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {hasActive && (
          <button
            onClick={onReset}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-foreground/40 transition-colors whitespace-nowrap shrink-0"
          >
            Скинути
          </button>
        )}
      </div>
    </div>
  )
}

/** Пагінація */
function Pagination({ page, totalPages, totalElements, isFirst, isLast, onChange }: {
  page: number; totalPages: number; totalElements: number
  isFirst: boolean; isLast: boolean; onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const range = Array.from({ length: totalPages }, (_, i) => i).filter(
    (i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1
  )

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-secondary/30 shrink-0">
      <span className="text-xs text-muted-foreground font-mono">{totalElements} записів</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={isFirst}
          className="h-6 w-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
        >‹</button>

        {range.map((p, idx) => {
          const gap = range[idx - 1] !== undefined && p - range[idx - 1] > 1
          return (
            <div key={p} className="flex items-center gap-1">
              {gap && <span className="text-xs text-muted-foreground px-0.5">…</span>}
              <button
                onClick={() => onChange(p)}
                className={`h-6 min-w-[24px] px-1.5 rounded text-xs transition-colors ${p === page
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >{p + 1}</button>
            </div>
          )
        })}

        <button
          onClick={() => onChange(page + 1)} disabled={isLast}
          className="h-6 w-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
        >›</button>
      </div>
    </div>
  )
}

/** Стан помилки — однаковий для обох колонок */
function ErrorState({ status, onRetry }: { status?: number; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-start gap-3 p-5">
      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">Не вдалося завантажити дані</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          {status === 400 || status === 500
            ? 'Бекенд повернув помилку. Перевір параметри запиту.'
            : `HTTP ${status ?? '—'}`}
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2"
        >
          <RefreshCw className="w-3 h-3" /> Спробувати знову
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Model status card
// ─────────────────────────────────────────────────────────────────────
const DEFAULT_MODEL = 'joeddav/xlm-roberta-large-xnli'

function ModelStatusCard() {
  const qc = useQueryClient()

  const { data: wsSettings } = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: workspaceApi.getSettings,
    staleTime: 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['model-status'],
    queryFn: trainingApi.modelStatus,
    refetchInterval: 10_000,
  })

  const retrainMutation = useMutation({
    mutationFn: trainingApi.retrain,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['model-status'] })
      toast.success('Модель відправлено на перенавчання')
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Помилка перенавчання')
    }
  })

  if (isLoading) return <div className="h-44 bg-secondary animate-pulse rounded-xl" />

  const isEmbedding = data?.current_method?.toLowerCase() === 'embedding_similarity'
  const modelLoaded = data?.zero_shot_model_loaded ?? false
  const totalExamples = data?.total_examples ?? 0

  const rawThreshold = data?.min_examples_to_switch ?? 5
  const threshold = Math.ceil(rawThreshold / 0.8)

  const counts = Object.values(data?.examples_per_category || {}) as number[]
  const minCategoryCount = counts.length > 0 ? Math.min(...counts) : 0

  const progressPercent = Math.min((minCategoryCount / threshold) * 100, 100)

  const modelName = wsSettings?.customModelId?.trim() ? wsSettings.customModelId : DEFAULT_MODEL
  const modelShort = modelName.includes('/') ? modelName.split('/').pop()! : modelName

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Статус моделі</h2>
        </div>
        <button
          onClick={() => retrainMutation.mutate()}
          disabled={retrainMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/40 px-3 py-1.5 rounded-md transition-all"
        >
          {retrainMutation.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Перенавчити
        </button>
      </div>

      {/* 3-column metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary/60 rounded-lg px-3 py-3 relative group">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs text-muted-foreground">Метод</p>

            {isEmbedding && minCategoryCount < threshold && (
              <div className="relative flex items-center justify-center">
                <span className="cursor-help text-amber-500 hover:text-amber-600 transition-colors text-[10px] w-3.5 h-3.5 flex items-center justify-center border border-current rounded-full">
                  !
                </span>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-2 bg-foreground text-background text-[10px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                  Додано нову категорію. Для нових повідомлень система тимчасово використовує <b>Zero-Shot</b>.
                  Розмітьте ще повідомлень (мін. {threshold} на кожну категорію), щоб повернутися на k-NN.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm font-medium font-mono leading-tight">
              {isEmbedding ? 'k-NN' : 'Zero-Shot'}
            </p>
            {isEmbedding && minCategoryCount < threshold && (
              <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded uppercase tracking-wider" title="Активний Fallback">
                Fallback
              </span>
            )}
          </div>
        </div>

        <div className="bg-secondary/60 rounded-lg px-3 py-3">
          <p className="text-xs text-muted-foreground mb-1">NLP Модель</p>
          <div className="flex items-center gap-1.5">
            {modelLoaded ? (
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.4)]" title="Готова до роботи" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin text-amber-500 shrink-0" />
            )}
            <p className={`text-sm font-medium font-mono leading-tight truncate ${!modelLoaded && 'text-amber-500/80'}`} title={modelName}>
              {modelLoaded ? modelShort : 'Завантаження...'}
            </p>
          </div>
        </div>

        <div className="bg-secondary/60 rounded-lg px-3 py-3">
          <p className="text-xs text-muted-foreground mb-1">Прикладів</p>
          <p className="text-sm font-medium font-mono">{totalExamples}</p>
        </div>
      </div>

      {!isEmbedding && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>До активації k-NN</span>
            <span className="font-mono">{minCategoryCount} / {threshold} (мін. на категорію)</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/60 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            k-NN увімкнеться, коли кожна категорія матиме мінімум {threshold} прикладів.
          </p>
        </div>
      )}

      {data?.examples_per_category && Object.keys(data.examples_per_category).length > 0 && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Готовність по категоріях</p>
            <p className="text-[10px] text-muted-foreground font-mono">поріг: {threshold}</p>
          </div>

          <div className="space-y-2">
            {Object.entries(data.examples_per_category)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, count]) => {
                const n = count as number
                const ready = n >= threshold
                const maxCount = counts.length > 0 ? Math.max(...counts) : 0
                const isImbalanced = n < maxCount * 0.5 && maxCount >= threshold

                return (
                  <div key={cat} className="group relative flex items-center gap-2">
                    {ready ? (
                      <span className="text-green-500 shrink-0 text-xs">✓</span>
                    ) : (
                      <span className="text-amber-500 shrink-0 text-xs">⚠</span>
                    )}

                    <span className="text-xs text-muted-foreground truncate flex-1">{cat}</span>

                    {isImbalanced && (
                      <span className="text-amber-500 cursor-help" title={`Дисбаланс: категорія має значно менше прикладів ніж інші (${n} проти ${maxCount}). Додайте більше даних сюди.`}>
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}

                    <span className={`text-[11px] font-mono shrink-0 w-8 text-right ${ready ? 'text-green-600' : 'text-amber-600'}`}>
                      {n}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Model Metrics Widget
// ─────────────────────────────────────────────────────────────────────
function ModelMetricsWidget({ status }: { status?: ModelStatusResponse }) {
  if (!status || status.accuracy === undefined || status.accuracy === null) {
    return null;
  }

  const toPercentage = (val?: number | null) => {
    if (val === undefined || val === null) return 'N/A'
    return `${(val * 100).toFixed(1)}%`
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 mt-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Якість останнього навчання</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-secondary/60 rounded-lg px-3 py-3 flex flex-col justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5" title="Загальна частка правильних відповідей">
            <Percent className="w-3.5 h-3.5" />
            Accuracy
          </div>
          <div className="text-lg font-bold font-mono text-foreground leading-none">
            {toPercentage(status.accuracy)}
          </div>
        </div>

        <div className="bg-secondary/60 rounded-lg px-3 py-3 flex flex-col justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5" title="Макро-усереднена F1-міра (баланс між точністю та повнотою для всіх категорій)">
            <BarChart className="w-3.5 h-3.5" />
            Macro F1-Score
          </div>
          <div className="text-lg font-bold font-mono text-foreground leading-none">
            {toPercentage(status.f1_score)}
          </div>
        </div>

        <div className="bg-secondary/60 rounded-lg px-3 py-3 flex flex-col justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5" title="Макро-точність (усереднена точність по всіх категоріях рівнозначно)">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Macro Precision
          </div>
          <div className="text-lg font-bold font-mono text-foreground leading-none">
            {toPercentage(status.precision)}
          </div>
        </div>

        <div className="bg-secondary/60 rounded-lg px-3 py-3 flex flex-col justify-between">
          <div className="text-xs text-muted-foreground mb-1.5">
            Тестова вибірка
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-foreground leading-none">
              {status.eval_count}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              повідомлень
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Annotation Queue (left column) — independent state
// ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

function AnnotationQueue({ sources, categories }: {
  sources: string[]
  categories: { id: number; name: string }[]
}) {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [selected, setSelected] = useState<Record<number, string>>({})

  const applyFilter = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(0)
  }
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(0) }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pending-messages', page, filters],
    queryFn: () => trainingApi.getPending(page, PAGE_SIZE, filters),
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const messages = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  const annotate = useMutation({
    mutationFn: ({ messageId, category, isPositive }: {
      messageId: number; category: string; isPositive: boolean
    }) => trainingApi.annotate(messageId, category, isPositive),
    onSuccess: (_, { messageId }) => {
      setSelected((s) => { const n = { ...s }; delete n[messageId]; return n })
      qc.invalidateQueries({ queryKey: ['pending-messages'] })
      qc.invalidateQueries({ queryKey: ['training-history'] })
      qc.invalidateQueries({ queryKey: ['model-status'] })
      toast.success('Анотацію збережено')
    },
    onError: () => toast.error('Помилка збереження анотації'),
  })

  const errStatus = (error as { response?: { status?: number } })?.response?.status

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium">Черга анотацій</h2>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {!isLoading && <span className="text-xs text-muted-foreground font-mono">{totalElements}</span>}
          <button onClick={() => refetch()} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters} sources={sources} categories={categories}
        onChange={applyFilter} onReset={resetFilters}
      />

      {/* Content */}
      {isError ? (
        <ErrorState status={errStatus} onRetry={refetch} />
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <Inbox className="w-7 h-7 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Черга порожня</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Нові повідомлення зі статусом NORMALIZED з'являться тут
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-auto flex-1 max-h-[600px]">
          {messages.map((msg) => (
            <li key={msg.id} className="px-4 py-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5 uppercase">{msg.source}</span>
                <p className="text-xs leading-relaxed flex-1">{msg.text}</p>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {formatSentAt(msg.sentAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selected[msg.id] ?? ''}
                  onChange={(e) => setSelected((s) => ({ ...s, [msg.id]: e.target.value }))}
                >
                  <option value="">Обрати категорію...</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button
                  disabled={!selected[msg.id] || annotate.isPending}
                  onClick={() => annotate.mutate({ messageId: msg.id, category: selected[msg.id], isPositive: true })}
                  title="Підтвердити"
                  className="h-7 px-2.5 text-xs bg-foreground text-background rounded-md hover:opacity-85 disabled:opacity-40 flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={!selected[msg.id] || annotate.isPending}
                  onClick={() => annotate.mutate({ messageId: msg.id, category: selected[msg.id], isPositive: false })}
                  title="Відхилити"
                  className="h-7 px-2.5 text-xs border border-border hover:border-foreground/40 rounded-md disabled:opacity-40 flex items-center text-muted-foreground hover:text-foreground"
                >
                  <Circle className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      <Pagination
        page={page} totalPages={totalPages} totalElements={totalElements}
        isFirst={data?.first ?? true} isLast={data?.last ?? true}
        onChange={setPage}
      />
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// HistoryItem helpers
// ─────────────────────────────────────────────────────────────────────

function parseUtc(iso: string): Date {
  if (!iso) return new Date(NaN)
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
}

function formatClassifiedAt(iso: string): string {
  const d = parseUtc(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('uk-UA', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatSentAt(iso: string): string {
  const d = parseUtc(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function AnnotationBadge({ isManual, confidence, isExample }: { isManual: boolean; confidence: number; isExample: boolean }) {
  const pct = Math.round(confidence * 100)

  return (
    <div className="flex items-center gap-1.5">
      {isExample || isManual ? (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0" title="Перевірено та додано до бази знань">
          <CheckCircle2 className="w-3.5 h-3.5" /> Підтверджено
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground shrink-0" title="Автоматично визначено моделлю">
          🤖 Auto ({pct}%)
        </span>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────
// History List (right column) — independent state
// ─────────────────────────────────────────────────────────────────────
function HistoryList({ sources, categories }: {
  sources: string[]
  categories: { id: number; name: string }[]
}) {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [saving, setSaving] = useState<number | null>(null)

  const applyFilter = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(0)
  }
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(0) }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['training-history', page, filters],
    queryFn: () => trainingApi.getHistory(page, PAGE_SIZE, filters),
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const history = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  const relabel = useMutation({
    mutationFn: ({ messageId, category }: { messageId: number; category: string }) =>
      trainingApi.annotate(messageId, category, true),
    onMutate: ({ messageId }) => setSaving(messageId),
    onSuccess: () => {
      setSaving(null)
      qc.invalidateQueries({ queryKey: ['training-history'] })
      qc.invalidateQueries({ queryKey: ['model-status'] })
      toast.success('Анотацію підтверджено')
    },
    onError: () => { setSaving(null); toast.error('Помилка оновлення') },
  })

  const errStatus = (error as { response?: { status?: number } })?.response?.status

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Історія розмітки</h2>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {!isLoading && <span className="text-xs text-muted-foreground font-mono">{totalElements}</span>}
          <button onClick={() => refetch()} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters} sources={sources} categories={categories}
        onChange={applyFilter} onReset={resetFilters}
      />

      {/* Content */}
      {isError ? (
        <ErrorState status={errStatus} onRetry={refetch} />
      ) : history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <History className="w-7 h-7 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Історія порожня</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">Анотовані повідомлення з'являться тут</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-auto flex-1 max-h-[600px]">
          {history.map((item) => (
            <li key={item.messageId} className="px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono uppercase shrink-0">
                  {item.source}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">
                  {formatClassifiedAt(item.classifiedAt)}
                </span>
              </div>
              <p className="text-xs leading-relaxed">{item.text}</p>
              <div className="flex items-center gap-2">
                <AnnotationBadge isManual={item.isManual} confidence={item.confidence} isExample={item.isExample} />

                <select
                  className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                  defaultValue={item.category}
                  disabled={saving === item.messageId}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v && v !== item.category) relabel.mutate({ messageId: item.messageId, category: v })
                  }}
                >
                  {!categories.find((c) => c.name === item.category) && (
                    <option value={item.category}>{item.category}</option>
                  )}
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>

                {!(item.isExample || item.isManual) && (
                  <button
                    disabled={saving === item.messageId}
                    onClick={() => relabel.mutate({ messageId: item.messageId, category: item.category })}
                    title="Підтвердити правильність та додати до прикладів навчання"
                    className="h-7 px-2.5 text-xs bg-foreground text-background rounded-md hover:opacity-85 disabled:opacity-40 flex items-center shrink-0"
                  >
                    {saving === item.messageId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {(item.isExample || item.isManual) && saving === item.messageId && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      <Pagination
        page={page} totalPages={totalPages} totalElements={totalElements}
        isFirst={data?.first ?? true} isLast={data?.last ?? true}
        onChange={setPage}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })

  const { data: sources = [] } = useQuery({
    queryKey: ['training-sources'],
    queryFn: trainingApi.getSources,
    staleTime: 60_000,
  })

  const { data: modelStatus } = useQuery({
    queryKey: ['model-status'],
    queryFn: trainingApi.modelStatus,
    refetchInterval: 10_000,
  })

  return (
    <div className="p-6">
      
      {/* ВЕРХНЯ ЧАСТИНА (ЗАГОЛОВОК) */}
      <div className="mb-6">
        <h1 className="text-lg font-medium tracking-tight">Навчання моделі</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">
          Анотуйте повідомлення та перенавчайте NLP-класифікатор
        </p>
      </div>

      {/* CSS GRID ДЛЯ ДВОКОЛОНКОВОГО LAYOUT ЗІ СТАТИЧНИМ САЙДБАРОМ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8 items-start max-w-[1400px]">
        
        {/* ЛІВА КОЛОНКА (Основний контент сторінки) */}
        <div className="w-full min-w-0 space-y-6">
          <ModelStatusCard />
          <ModelMetricsWidget status={modelStatus} />

          {/* Внутрішній грід для двох черг (Черга анотацій + Історія) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <AnnotationQueue sources={sources} categories={categories} />
            <HistoryList sources={sources} categories={categories} />
          </div>
        </div>

        {/* ПРАВА КОЛОНКА (Віджет онбордингу) */}
        <div className="sticky top-6 w-full hidden xl:block">
          <OnboardingWidget />
        </div>

      </div>
    </div>
  )
}