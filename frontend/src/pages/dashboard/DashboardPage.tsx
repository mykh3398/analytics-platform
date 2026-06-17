import { useState, useEffect, KeyboardEvent, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie
} from 'recharts'
import { X, Plus, TrendingUp, BarChart2, Loader2, Download, Calendar as CalendarIcon } from 'lucide-react'
import { toPng, toSvg } from 'html-to-image'
import { analyticsApi } from '@/api/analytics'
import type { TrendPoint, SourceDistribution } from '@/api/analytics'
import { mapHeatmapToLocalTime } from '@/lib/heatmap'
import { toast } from '@/store/toast'
import { useAuthStore } from '@/store/auth'
import { OnboardingWidget } from '@/components/widgets/OnboardingWidget'
import { cn } from '@/lib/utils'

// ── Helpers & Date Utils ──────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }

// ── Export Utility ────────────────────────────────────────────────────
const downloadChart = async (
  elementRef: React.RefObject<HTMLElement | null>,
  fileName: string,
  format: 'png' | 'svg' = 'png'
) => {
  if (!elementRef.current) return

  try {
    const options = {
      backgroundColor: '#ffffff',
      pixelRatio: 2, 
      skipFonts: true, 
      style: { 
        padding: '32px 120px 64px 32px', 
        margin: '0'
      },
      filter: (node: HTMLElement | Node) => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('recharts-tooltip-wrapper')) return false;
        }
        return true;
      }
    }

    const dataUrl = format === 'png'
      ? await toPng(elementRef.current, options)
      : await toSvg(elementRef.current, options)

    const link = document.createElement('a')
    link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.${format}`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Помилка при експорті графіка:', error)
    toast.error('Не вдалося експортувати графік')
  }
}

// ── Constants ─────────────────────────────────────────────────────────
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const SOURCE_COLORS: Record<string, string> = {
  TELEGRAM: '#0ea5e9',
  INSTAGRAM: '#ec4899',
  FACEBOOK: '#3b82f6',
  VIBER: '#8b5cf6',
  WHATSAPP: '#22c55e',
}

const LINE_PALETTE = [
  '#0ea5e9', '#ec4899', '#f59e0b',
  '#22c55e', '#8b5cf6', '#ef4444',
]

// ── UI Components ─────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-secondary animate-pulse rounded-md ${className}`} />
}

function CardShell({ title, children, action, onExport }: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  onExport?: (format: 'png' | 'svg') => void
}) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'png' | 'svg') => {
    if (!onExport) return
    setIsExporting(true)
    try {
      await onExport(format)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-3">
          {action}
          {onExport && (
            <div className="flex gap-2 border-l border-border pl-3 ml-1">
              <button
                onClick={() => handleExport('svg')}
                disabled={isExporting}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                title="Завантажити SVG"
              >
                SVG
              </button>
              <button
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                title="Завантажити PNG"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

function StatCard({ label, value, tooltip }: { label: string; value: string | number; tooltip?: string }) {
  return (
    <div className="bg-secondary/60 rounded-lg px-4 py-3 relative group">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {tooltip && (
          <div className="relative flex items-center justify-center">
            <span className="cursor-help text-muted-foreground/60 hover:text-muted-foreground transition-colors text-[10px] w-3.5 h-3.5 flex items-center justify-center border border-current rounded-full">
              i
            </span>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-foreground text-background text-[10px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
            </div>
          </div>
        )}
      </div>
      <p className="text-2xl font-medium tracking-tight">{value}</p>
    </div>
  )
}

// ── Charts ────────────────────────────────────────────────────────────
function Heatmap({ data }: { data: { dayOfWeek: number; hour: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const map = new Map(data.map((d) => [`${d.dayOfWeek}-${d.hour}`, d.count]))

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] pr-12 pb-8"> 
        <div className="flex ml-8 mb-1">
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <div key={h} className="text-[10px] text-muted-foreground font-mono" style={{ width: `${(1 / 8) * 100}%` }}>
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] text-muted-foreground font-mono w-7 shrink-0">{day}</span>
            <div className="flex gap-0.5 flex-1">
              {HOURS.map((h) => {
                const count = map.get(`${dayIdx}-${h}`) ?? 0
                const intensity = count / max
                return (
                  <div
                    key={h}
                    title={`${day} ${String(h).padStart(2, '0')}:00 — ${count}`}
                    className="flex-1 h-5 rounded-sm"
                    style={{
                      background: `hsl(222,20%,${Math.round(8 + (1 - intensity) * 88)}%)`,
                      opacity: count === 0 ? 0.15 : 0.4 + intensity * 0.6,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const PIN_LIMIT = 5

function TopicsAllModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [pinnedList, setPinnedList] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const { data: savedPinned, isLoading: isPinnedLoading } = useQuery({
    queryKey: ['topics-pinned'],
    queryFn: analyticsApi.getPinnedTopics,
    staleTime: 0,
  })

  // В модалці підтягуємо всі теми (без дат, бо це налаштування простору)
  const { data, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['topics-all'],
    queryFn: () => analyticsApi.topicsAll(),
    staleTime: 60_000,
  })

  const allTopics = Array.isArray(data) ? data : []
  const isLoading = isPinnedLoading || isTopicsLoading

  useEffect(() => {
    if (!isPinnedLoading && savedPinned && !initialized) {
      setPinnedList(savedPinned)
      setInitialized(true)
    }
  }, [savedPinned, isPinnedLoading, initialized])

  const pinnedSet = new Set(pinnedList)
  const unpinned = [...allTopics]
    .filter((t) => !pinnedSet.has(t.category))
    .sort((a, b) => b.count - a.count)

  const pinnedItems = pinnedList
    .map((name) => allTopics.find((t) => t.category === name))
    .filter(Boolean) as typeof allTopics

  const atLimit = pinnedList.length >= PIN_LIMIT

  const saveMutation = useMutation({
    mutationFn: (categories: string[]) => analyticsApi.savePinnedTopics(categories),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] })
      qc.invalidateQueries({ queryKey: ['topics-pinned'] })
    },
    onError: () => toast.error('Помилка збереження. Спробуйте знову.'),
  })

  const handleSave = () => saveMutation.mutate(pinnedList, { onSuccess: () => { toast.success('Налаштування збережено'); onClose() } })
  const handleReset = () => saveMutation.mutate([], { onSuccess: () => { toast.success('Скинуто до Топ-5'); onClose() } })
  const pin = (category: string) => { if (!atLimit) setPinnedList((prev) => [...prev, category]) }
  const unpin = (category: string) => setPinnedList((prev) => prev.filter((c) => c !== category))

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx) }
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return
    setPinnedList((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(null)
    setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-medium">Повний список тем</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Закріпіть до {PIN_LIMIT} тем та налаштуйте їх порядок</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5"><div className="h-3 bg-secondary rounded animate-pulse w-3/4" /><div className="h-2 bg-secondary rounded animate-pulse" /></div>
              ))}
            </div>
          ) : (
            <>
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">📌 Закріплені</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: PIN_LIMIT }).map((_, i) => (
                      <div key={i} className={`w-4 h-1 rounded-full transition-colors ${i < pinnedList.length ? 'bg-foreground' : 'bg-border'}`} />
                    ))}
                    <span className="text-[10px] text-muted-foreground font-mono ml-1.5">{pinnedList.length}/{PIN_LIMIT}</span>
                  </div>
                </div>
                {pinnedItems.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg py-5 text-center">
                    <p className="text-xs text-muted-foreground font-mono">Натисніть 📌 щоб закріпити тему</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pinnedItems.map((item, idx) => (
                      <div
                        key={item.category}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-all select-none ${dragIdx === idx ? 'opacity-40 border-dashed border-foreground/40' : overIdx === idx && dragIdx !== null ? 'border-foreground bg-foreground/5 scale-[1.01]' : 'border-border bg-foreground/3 hover:border-foreground/30'
                          }`}
                      >
                        <span className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 select-none leading-none" style={{ fontSize: 14 }}>⋮⋮</span>
                        <span className="text-[10px] font-mono text-muted-foreground/50 w-4 shrink-0 text-center">{idx + 1}</span>
                        <span className="text-xs font-medium flex-1 truncate">{item.category}</span>
                        <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">{item.percentage.toFixed(1)}%</span>
                        <button onClick={() => unpin(item.category)} className="shrink-0 text-sm leading-none opacity-60 hover:opacity-100 transition-opacity" title="Відкріпити">📌</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mx-5 border-t border-border" />

              <div className="px-5 pt-3 pb-4">
                <span className="text-xs font-medium text-muted-foreground mb-2 block">Інші теми</span>
                {unpinned.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-mono text-center py-3">Всі теми закріплені</p>
                ) : (
                  <div className="space-y-1.5">
                    {unpinned.map((item) => {
                      const disabled = atLimit
                      return (
                        <div
                          key={item.category}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${disabled ? 'border-border opacity-40' : 'border-border hover:border-foreground/30 cursor-pointer'}`}
                          onClick={() => !disabled && pin(item.category)}
                        >
                          <button disabled={disabled} onClick={(e) => { e.stopPropagation(); !disabled && pin(item.category) }} className="shrink-0 text-sm leading-none opacity-25 hover:opacity-80 transition-opacity disabled:cursor-not-allowed" title={disabled ? `Максимум ${PIN_LIMIT} тем` : 'Закріпити'}>📌</button>
                          <span className="text-xs text-muted-foreground flex-1 truncate">{item.category}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-foreground/25 rounded-full" style={{ width: `${item.percentage}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground/70 w-11 text-right">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 bg-secondary/30 space-y-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">Скасувати</button>
            <button onClick={handleSave} disabled={saveMutation.isPending || pinnedList.length === 0} className="flex-1 h-9 bg-foreground text-background rounded-md text-xs font-medium hover:opacity-85 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Зберегти {pinnedList.length > 0 && `(${pinnedList.length})`}
            </button>
          </div>
          <button onClick={handleReset} disabled={saveMutation.isPending} className="w-full h-8 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5">
            <span className="text-[11px]">↺</span> Скинути до Топ-5
          </button>
        </div>
      </div>
    </div>
  )
}

function TopicsBar({ data, onOthersClick }: {
  data: { category: string; count: number; percentage: number }[]
  onOthersClick: () => void
}) {
  const handleOthersClick = onOthersClick
  return (
    <div className="space-y-2.5 pb-6 pr-10">
      {data.map((item) => {
        const isOthers = item.category === 'Інші'
        return (
          <div key={item.category} className={isOthers ? 'cursor-pointer group' : undefined} onClick={isOthers ? handleOthersClick : undefined} title={isOthers ? 'Натисніть щоб побачити повний список тем' : undefined}>
            <div className="flex justify-between text-xs mb-1">
              <span className={isOthers ? 'text-muted-foreground/70 group-hover:text-muted-foreground transition-colors flex items-center gap-1' : 'text-muted-foreground truncate pr-2'}>
                {isOthers && <span className="text-[10px]">⋯</span>} {item.category}
              </span>
              <span className={`font-mono shrink-0 ${isOthers ? 'text-muted-foreground/70' : ''}`}>{item.percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mr-6">
              <div className={`h-full rounded-full transition-all ${isOthers ? 'bg-border group-hover:bg-muted-foreground/30' : 'bg-foreground/50'}`} style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const RADIAN = Math.PI / 180

function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number
  innerRadius: number; outerRadius: number; percent: number
}) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={500}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function SourceDonut({ data }: { data: SourceDistribution[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const chartData = data.map((d) => ({ name: d.source, value: d.count }))
  const SOURCE_LABELS: Record<string, string> = {
    TELEGRAM: 'Telegram', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', VIBER: 'Viber', WHATSAPP: 'WhatsApp',
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 pl-4 h-full">
      <ResponsiveContainer width={220} height={200}>
        <PieChart margin={{ top: 10, right: 40, bottom: 30, left: 10 }}>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" labelLine={false} label={DonutLabel as never}>
            {chartData.map((entry, i) => <Cell key={i} fill={SOURCE_COLORS[entry.name] ?? '#94a3b8'} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`, '']} labelFormatter={(l: string) => SOURCE_LABELS[l] ?? l} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 flex-1 min-w-0 pr-8"> 
        {data.map((d) => (
          <div key={d.source} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[d.source] ?? '#94a3b8' }} />
            <span className="text-xs text-muted-foreground flex-1 truncate">{SOURCE_LABELS[d.source] ?? d.source}</span>
            <span className="text-xs font-mono shrink-0">{((d.count / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
        <div className="pt-2 mt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">Всього: </span>
          <span className="text-xs font-mono font-medium">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function KeywordTrends({ from, to }: { from?: string; to?: string }) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [input, setInput] = useState('')
  const chartRef = useRef<HTMLDivElement>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['trends', keywords, from, to],
    queryFn: () => analyticsApi.trends(keywords, from, to),
    enabled: keywords.length > 0,
  })

  const addKeyword = () => {
    const kw = input.trim().toLowerCase()
    if (kw && !keywords.includes(kw) && keywords.length < 6) {
      setKeywords((k) => [...k, kw])
      setInput('')
    }
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') addKeyword() }
  const trendData = data as TrendPoint[]

  return (
    <CardShell
      title="Аналіз трендів"
      onExport={keywords.length > 0 && !isLoading ? (format) => downloadChart(chartRef, 'keyword-trends', format) : undefined}
    >
      <div ref={chartRef} className="bg-card pb-6">
        <div className="flex flex-wrap gap-3 mb-4 pr-4"> 
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[200px] border border-input bg-secondary rounded-md px-2 py-1">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 text-xs bg-foreground/10 px-2 py-0.5 rounded-full">
                {kw}
                <button onClick={() => setKeywords((k) => k.filter((w) => w !== kw))} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {keywords.length < 6 && (
              <input
                className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                placeholder={keywords.length === 0 ? 'Введіть слово...' : 'Ще слово...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
              />
            )}
          </div>
          <button onClick={addKeyword} disabled={!input.trim() || keywords.length >= 6} className="h-9 px-3 bg-foreground text-background rounded-md text-xs hover:opacity-85 disabled:opacity-40 transition-all flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Додати
          </button>
        </div>

        {keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center gap-2">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-mono">Додайте ключові слова щоб побачити тренди</p>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 10, right: 40, bottom: 30, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: 'hsl(var(--foreground))' }}>{v}</span>} />
              {keywords.map((kw, i) => <Line key={kw} type="monotone" dataKey={kw} stroke={LINE_PALETTE[i % LINE_PALETTE.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />)}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </CardShell>
  )
}

// ── Main Dashboard Page ───────────────────────────────────────────────
export default function DashboardPage() {
  const [showDrilldown, setShowDrilldown] = useState(false)
  const wsId = useAuthStore((s) => s.currentWorkspaceId)

  const [dateRangeMode, setDateRangeMode] = useState<'ALL' | 'CUSTOM'>('ALL')
  const [customFrom, setCustomFrom] = useState(daysAgo(30))
  const [customTo, setCustomTo] = useState(today())

  const apiFrom = dateRangeMode === 'ALL' ? undefined : customFrom
  const apiTo = dateRangeMode === 'ALL' ? undefined : customTo

  const heatmapRef = useRef<HTMLDivElement>(null)
  const sourcesRef = useRef<HTMLDivElement>(null)
  const topicsRef = useRef<HTMLDivElement>(null)

  const heatmap = useQuery({ queryKey: ['heatmap', wsId, apiFrom, apiTo], queryFn: () => analyticsApi.heatmap(apiFrom, apiTo) })
  const funnel = useQuery({ queryKey: ['funnel', wsId, apiFrom, apiTo], queryFn: () => analyticsApi.funnel(apiFrom, apiTo) })
  const topics = useQuery({ queryKey: ['topics', wsId, apiFrom, apiTo], queryFn: () => analyticsApi.topics(apiFrom, apiTo) })
  const sources = useQuery({ queryKey: ['source-distribution', wsId, apiFrom, apiTo], queryFn: () => analyticsApi.sourceDistribution(apiFrom, apiTo) })

  const funnelData = Array.isArray(funnel.data) ? funnel.data : []
  const topicsData = Array.isArray(topics.data) ? topics.data : []
  const heatmapData = Array.isArray(heatmap.data) ? mapHeatmapToLocalTime(heatmap.data) : []
  const sourcesData = Array.isArray(sources.data) ? sources.data : []

  const totalMessages = funnelData.find((f) => f.stage === 'RECEIVED')?.count ?? 0
  const totalLeads = funnelData.find((f) => f.stage === 'LEAD')?.count ?? 0
  const totalClassified = funnelData.find((f) => f.stage === 'CLASSIFIED')?.count ?? 0
  const convRate = totalMessages ? ((totalLeads / totalMessages) * 100).toFixed(1) : '—'

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Дашборд</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">
            {dateRangeMode === 'ALL' ? 'аналітика за весь час' : `дані з ${apiFrom} по ${apiTo}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card border border-border p-1.5 rounded-xl shadow-sm">
          <div className="flex items-center bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setDateRangeMode('ALL')}
              className={cn(
                "px-4 h-8 rounded-md text-xs font-medium transition-all duration-200",
                dateRangeMode === 'ALL' ? "bg-background border border-border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              За весь час
            </button>
            <button
              onClick={() => setDateRangeMode('CUSTOM')}
              className={cn(
                "px-4 h-8 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
                dateRangeMode === 'CUSTOM' ? "bg-background border border-border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Період
            </button>
          </div>

          {dateRangeMode === 'CUSTOM' && (
            <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <input 
                type="date" 
                value={customFrom} 
                max={customTo} 
                onChange={(e) => setCustomFrom(e.target.value)} 
                className="h-8 px-2.5 text-xs border border-input bg-background rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-ring text-foreground" 
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input 
                type="date" 
                value={customTo} 
                min={customFrom} 
                max={today()} 
                onChange={(e) => setCustomTo(e.target.value)} 
                className="h-8 px-2.5 text-xs border border-input bg-background rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-ring text-foreground" 
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-5 min-w-0">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Повідомлень" value={totalMessages.toLocaleString()} />
            <StatCard
              label="Класифіковано"
              value={totalClassified.toLocaleString()}
              tooltip="Враховуються лише впевнені розпізнавання (≥ 70%) або повідомлення, перевірені вручну."
            />
            <StatCard label="Лідів" value={totalLeads.toLocaleString()} />
            <StatCard label="Конверсія" value={`${convRate}%`} />
          </div>

          <CardShell
            title="Теплова карта активності"
            onExport={heatmapData.length > 0 && !heatmap.isLoading ? (format) => downloadChart(heatmapRef, 'heatmap', format) : undefined}
          >
            <div ref={heatmapRef} className="bg-card">
              {heatmap.isLoading ? <Skeleton className="h-36 w-full" /> : heatmapData.length > 0 ? <Heatmap data={heatmapData} /> : <p className="text-sm text-muted-foreground font-mono">Немає даних</p>}
            </div>
          </CardShell>

          <div className="grid lg:grid-cols-2 gap-4">
            <CardShell 
              title="Розподіл за темами"
              onExport={topicsData.length > 0 && !topics.isLoading ? (format) => downloadChart(topicsRef, 'topics', format) : undefined}
            >
              <div ref={topicsRef} className="bg-card h-full">
                {topics.isLoading ? <Skeleton className="h-52 w-full" /> : topicsData.length > 0 ? <TopicsBar data={topicsData} onOthersClick={() => setShowDrilldown(true)} /> : <p className="text-sm text-muted-foreground font-mono">Немає категорій. Додайте їх у розділі «Категорії».</p>}
              </div>
            </CardShell>

            <CardShell
              title="Розподіл за каналами"
              onExport={sourcesData.length > 0 && !sources.isLoading ? (format) => downloadChart(sourcesRef, 'sources', format) : undefined}
            >
              <div ref={sourcesRef} className="bg-card h-full">
                {sources.isLoading ? <Skeleton className="h-44 w-full" /> : sourcesData.length > 0 ? <SourceDonut data={sourcesData} /> : <p className="text-sm text-muted-foreground font-mono">Немає даних</p>}
              </div>
            </CardShell>
          </div>

          <KeywordTrends from={apiFrom} to={apiTo} />
        </div>

        <div className="w-full xl:w-[320px] shrink-0 sticky top-6 hidden xl:block">
          <OnboardingWidget />
        </div>
      </div>

      {showDrilldown && (
        <TopicsAllModal onClose={() => setShowDrilldown(false)} />
      )}
    </div>
  )
}