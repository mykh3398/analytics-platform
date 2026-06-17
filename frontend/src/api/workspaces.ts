import api from '@/lib/axios'
import type { Role } from '@/types'

export interface Workspace {
  id: number
  name: string
  role: Role   
}

export const workspacesApi = {
  getAll: () =>
    api.get<Workspace[]>('/workspaces').then((r) => r.data),

  create: (name: string) =>
    api.post<Workspace>('/workspaces', { name }).then((r) => r.data),

  // НОВИЙ МЕТОД
  delete: (id: number) =>
    api.delete(`/workspaces/${id}`).then((r) => r.data),
}