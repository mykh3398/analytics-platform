import api from '@/lib/axios'
import type { WorkspaceSettings } from '@/types'

export const USE_MOCK_WORKSPACE = false

const MOCK_SETTINGS: WorkspaceSettings = {
  workspaceName: 'Мій Workspace',
  modelType: 'DEFAULT',
  customModelId: '',
}

export const workspaceApi = {
  getSettings: async (): Promise<WorkspaceSettings> => {
    if (USE_MOCK_WORKSPACE) return MOCK_SETTINGS
    return api.get<WorkspaceSettings>('/workspace/settings').then((r) => r.data)
  },

  updateSettings: async (data: WorkspaceSettings): Promise<WorkspaceSettings> => {
    if (USE_MOCK_WORKSPACE) {
      Object.assign(MOCK_SETTINGS, data)
      return { ...MOCK_SETTINGS }
    }
    return api.put<WorkspaceSettings>('/workspace/settings', data).then((r) => r.data)
  },
}

export interface ApiKey {
  id: number
  name: string
  keyValue: string 
  createdAt: string
}

export const apiKeysApi = {
  getKeys: async (workspaceId: number): Promise<ApiKey[]> => {
    const res = await api.get(`/workspaces/${workspaceId}/api-keys`)
    return res.data
  },
  
  createKey: async (workspaceId: number, name: string): Promise<string> => {
    const res = await api.post(`/workspaces/${workspaceId}/api-keys?name=${encodeURIComponent(name)}`)
    return res.data
  },

  deleteKey: async (workspaceId: number, keyId: number): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/api-keys/${keyId}`)
  }
}