// ── RBAC ─────────────────────────────────────────────────────────────
export type Role = 'OWNER' | 'EDITOR' | 'VIEWER'

// ── Auth ──────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  companyName: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  user: User
}

export interface User {
  id: string | number
  email: string
  firstName: string
  lastName: string
  companyName: string
  // Бекенд повертає map workspaceId → роль
  workspaceRoles?: Record<string, Role>
}

// ── Sources / Collectors ──────────────────────────────────────────────
export type SourceType = 'TELEGRAM' | 'INSTAGRAM' | 'FACEBOOK' | 'VIBER' | 'WHATSAPP'

export interface Source {
  id: string
  type: SourceType
  instanceId: string
  label: string
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR'
  createdAt: string
}

export interface CreateSourceRequest {
  type: SourceType
  instanceId: string
  token: string
  label?: string
}

// ── Categories ────────────────────────────────────────────────────────
export interface Category {
  id: number
  name: string
  isLead: boolean
  tenantId: string
  createdAt: string
}

export interface CreateCategoryRequest {
  name: string
  isLead: boolean
}

// ── RawMessageDto (mirrors backend) ──────────────────────────────────
export interface RawMessageDto {
  source: SourceType
  instanceId: string
  externalId: string
  chatId: string
  senderId: string
  senderName: string
  text: string
  sentAt: string
  rawPayload: string
}

// ── Analytics ─────────────────────────────────────────────────────────
export interface HeatmapDto {
  dayOfWeek: number  // 0=Неділя … 6=Субота (UTC, JS Date convention)
  hourUtc: number    // 0-23 UTC — конвертується через mapHeatmapToLocalTime()
  count: number
}

export interface FunnelDto {
  stage: 'RECEIVED' | 'CLASSIFIED' | 'LEAD' | 'PROCESSED'
  count: number
}

export interface TopicDto {
  category: string
  count: number
  percentage: number
}

// ── Training ──────────────────────────────────────────────────────────
export interface TrainingExample {
  id: number
  messageId: number
  category: string
  isPositive: boolean
  annotatedAt: string
  tenantId: string
}

export interface ModelStatusResponse {
  current_method: 'zero_shot' | 'embedding_similarity'
  total_examples: number
  examples_per_category: Record<string, number>
  min_examples_to_switch: number
  zero_shot_model_loaded: boolean
  accuracy?: number | null
  f1_score?: number | null
  precision?: number | null
  recall?: number | null
  eval_count?: number | null
}

export interface RetrainResponse {
  status: string
  examples_count: number
  method: string
  eval_count?: number | null
  accuracy?: number | null
  f1_score?: number | null
  precision?: number | null
  recall?: number | null
}

// ── API generic ───────────────────────────────────────────────────────
export interface ApiError {
  message: string
  status: number
  timestamp: string
}

// ── Workspace Settings ────────────────────────────────────────────────
export interface WorkspaceSettings {
  workspaceName: string
  modelType: 'DEFAULT' | 'CUSTOM'
  customModelId?: string
}