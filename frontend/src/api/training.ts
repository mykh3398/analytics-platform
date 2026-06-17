import api from '@/lib/axios'

export interface ChannelSource {
  source: string
}

export interface ModelStatus {
  total_examples: number
  accuracy: number | null
}

export const trainingApi = {
  getSources: () =>
    api
      .get<ChannelSource[]>('/training/sources')
      .then((r) => r.data),

  modelStatus: () =>
    api
      .get<ModelStatus>('/training/history')
      .then((r) => r.data),
}