import api from '@/lib/axios'
import type { HeatmapDto, FunnelDto, TopicDto } from '@/types'

export interface TrendPoint {
  date: string
  [keyword: string]: string | number
}

export interface SourceDistribution {
  source: string
  count: number
}

// ── Mock flags ────────────────────────────────────────────────────────
const USE_MOCK_TRENDS = false   
const USE_MOCK_SOURCES = false  

function generateMockTrends(words: string[], from: string, to: string): TrendPoint[] {
  const result: TrendPoint[] = []
  const start = new Date(from)
  const end = new Date(to)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const point: TrendPoint = { date: d.toISOString().split('T')[0] }
    words.forEach((w) => { point[w] = Math.floor(Math.random() * 40 + 5) })
    result.push({ ...point })
  }
  return result
}

const MOCK_SOURCES: SourceDistribution[] = [
  { source: 'TELEGRAM', count: 450 },
  { source: 'INSTAGRAM', count: 210 },
  { source: 'FACEBOOK', count: 180 },
  { source: 'VIBER', count: 120 },
  { source: 'WHATSAPP', count: 90 },
]

export const analyticsApi = {
  heatmap: (from?: string, to?: string) =>
    api.get<HeatmapDto[]>('/metrics/heatmap', { params: { from, to } }).then((r) => r.data),

  funnel: (from?: string, to?: string) =>
    api
      .get<{ totalMessages?: number; classified?: number; leads?: number } | FunnelDto[]>(
        '/metrics/funnel',
        { params: { from, to } } 
      )
      .then((r) => {
        const raw = r.data
        if (Array.isArray(raw)) return raw as FunnelDto[]
        const obj = raw as { totalMessages?: number; classified?: number; leads?: number }
        return [
          { stage: 'RECEIVED', count: obj.totalMessages ?? 0 },
          { stage: 'CLASSIFIED', count: obj.classified ?? 0 },
          { stage: 'LEAD', count: obj.leads ?? 0 },
        ] as FunnelDto[]
      }),

  topics: (from?: string, to?: string) =>
    api.get<TopicDto[]>('/metrics/topics', { params: { from, to } }).then((r) => r.data),

  topicsAll: (from?: string, to?: string) =>
    api.get<TopicDto[]>('/metrics/topics/all', { params: { from, to } }).then((r) => r.data),

  getPinnedTopics: () =>
    api.get<string[]>('/metrics/topics/pinned').then((r) =>
      Array.isArray(r.data) ? r.data : []
    ),

  savePinnedTopics: (categories: string[]) =>
    api.post<void>('/metrics/topics/pinned', categories).then((r) => r.data),

  trends: async (words: string[], from?: string, to?: string): Promise<TrendPoint[]> => {
    if (words.length === 0) return []

    if (USE_MOCK_TRENDS) return generateMockTrends(words, from || '2020-01-01', to || new Date().toISOString().split('T')[0])

    const responses = await Promise.all(
      words.map((word) =>
        api
          .get<{ date: string; count: number }[]>('/metrics/trends', {
            params: { word, from, to },
          })
          .then((r) => ({ word, points: r.data }))
      )
    )

    const dateSet = new Set<string>()
    responses.forEach(({ points }) => points.forEach((p) => dateSet.add(p.date)))
    const dates = Array.from(dateSet).sort()

    return dates.map((date) => {
      const point: TrendPoint = { date }
      responses.forEach(({ word, points }) => {
        const found = points.find((p) => p.date === date)
        point[word] = found?.count ?? 0
      })
      return point
    })
  },

  sourceDistribution: async (from?: string, to?: string): Promise<SourceDistribution[]> => {
    if (USE_MOCK_SOURCES) return MOCK_SOURCES
    return api.get<SourceDistribution[]>('/metrics/sources', { params: { from, to } }).then((r) => r.data)
  },
}