import api from '@/lib/axios'
import type { Category, CreateCategoryRequest } from '@/types'

function normalize(raw: Record<string, unknown>): Category {
  const isLead =
    raw['isLead'] ??
    raw['lead'] ??
    raw['is_lead'] ??
    false

  return {
    id:        raw['id'] as number,
    name:      raw['name'] as string,
    isLead:    Boolean(isLead),
    tenantId:  raw['tenantId'] as string ?? raw['tenant_id'] as string ?? '',
    createdAt: raw['createdAt'] as string ?? raw['created_at'] as string ?? '',
  }
}

export const categoriesApi = {
  getAll: () =>
    api.get<Record<string, unknown>[]>('/categories')
       .then((r) => r.data.map(normalize)),

  create: (data: CreateCategoryRequest) =>
    api.post<Record<string, unknown>>('/categories', data)
       .then((r) => normalize(r.data)),

  delete: (id: number, targetCategory?: string) =>
    api.delete(`/categories/${id}`, {
      params: targetCategory ? { targetCategory } : undefined,
    }),

  toggleLead: (id: number) =>
    api.patch<Record<string, unknown>>(`/categories/${id}/toggle-lead`)
       .then((r) => normalize(r.data)),

  rename: (id: number, name: string) => 
    api.put<Category>(`/categories/${id}/rename`, { name }).then((r) => r.data),
}