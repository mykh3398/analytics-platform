import axios from 'axios'
import { toast } from '@/store/toast'
import { useAuthStore } from '@/store/auth'

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register']

let lastForbiddenToast = 0;

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('pulse-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

function forceLogout() {
  console.trace("Хтось викликав forceLogout! Ось стек викликів:");
  localStorage.removeItem('pulse-auth')
  toast.error('Ваша сесія закінчилась. Будь ласка, увійдіть знову.')
  setTimeout(() => {
    window.location.href = '/login'
  }, 800)
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  const wsId = useAuthStore.getState().currentWorkspaceId
  if (wsId) {
    config.headers['X-Workspace-Id'] = wsId
  }
  
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => url.includes(e))

    // 1. Тільки 401 призводить до логауту
    if (status === 401 && !isAuthEndpoint) {
      forceLogout()
    }

    // 2. 403 — повідомляємо з захистом від спаму (не частіше разу на 3 секунди)
    if (status === 403) {
      const now = Date.now();
      if (now - lastForbiddenToast > 3000) {
        toast.error('У вас недостатньо прав для цієї дії')
        lastForbiddenToast = now;
      }
    }

    return Promise.reject(error)
  }
)

export default api