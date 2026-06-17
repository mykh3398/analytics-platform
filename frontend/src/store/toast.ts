import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, type?: Toast['type']) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (message, type = 'info') => {
    const id = `toast-${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    // Автоматично прибираємо через 4 секунди
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Виклик toast поза React-компонентами (з interceptor)
export const toast = {
  error:   (msg: string) => useToastStore.getState().show(msg, 'error'),
  success: (msg: string) => useToastStore.getState().show(msg, 'success'),
  info:    (msg: string) => useToastStore.getState().show(msg, 'info'),
}