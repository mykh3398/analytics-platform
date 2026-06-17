import api from '@/lib/axios'
import type { Role } from '@/types'

export interface Member {
  id: number
  email: string
  firstName: string
  lastName: string
  role: Role
}

export const membersApi = {
  getAll: (workspaceId: string | number) =>
    api
      .get<Member[]>(`/workspaces/${workspaceId}/members`)
      .then((r) => r.data),

  add: (workspaceId: string | number, payload: { email: string; role: Role }) =>
    api
      .post<Member>(`/workspaces/${workspaceId}/members`, payload)
      .then((r) => r.data),

  updateRole: (workspaceId: string | number, memberId: number, role: Role) =>
    api
      .put<Member>(`/workspaces/${workspaceId}/members/${memberId}`, { role })
      .then((r) => r.data),

  remove: (workspaceId: string | number, memberId: number) =>
    api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
}