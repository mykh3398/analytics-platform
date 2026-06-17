import api from '@/lib/axios'
import type { Source, CreateSourceRequest, SourceType } from '@/types'

// ── Mock ────────────────
const USE_MOCK = false

let MOCK_SOURCES: Source[] = [
  {
    id: 'mock-1',
    type: 'TELEGRAM',
    instanceId: 'sales',
    label: 'sales',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
]

export const sourcesApi = {
  getAll: async (): Promise<Source[]> => {
    if (USE_MOCK) return [...MOCK_SOURCES]
    return api.get<Source[]>('/channels').then((r) => r.data)
  },

  create: async (data: CreateSourceRequest): Promise<Source> => {
    if (USE_MOCK) {
      const newSource: Source = {
        id: `mock-${Date.now()}`,
        type: data.type,
        instanceId: data.instanceId,
        label: data.label ?? data.instanceId,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      }
      MOCK_SOURCES = [...MOCK_SOURCES, newSource]
      return newSource
    }
    return api.post<Source>('/channels', data).then((r) => r.data)
  },

  delete: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      MOCK_SOURCES = MOCK_SOURCES.filter((s) => s.id !== id)
      return
    }
    await api.delete(`/channels/${id}`)
  },
}

export function detectSourceType(value: string): {
  type: SourceType | null
  confidence: 'high' | 'low'
} {
  const v = value.trim()

  if (/^\d{8,10}:[A-Za-z0-9_-]{35}$/.test(v)) {
    return { type: 'TELEGRAM', confidence: 'high' }
  }
  if (/^EAA[A-Za-z0-9]{50,}$/.test(v)) {
    return { type: 'INSTAGRAM', confidence: 'high' }
  }
  if (/^[a-f0-9]{16}-[a-f0-9]+-[a-f0-9]+$/i.test(v)) {
    return { type: 'VIBER', confidence: 'high' }
  }

  return { type: null, confidence: 'low' }
}