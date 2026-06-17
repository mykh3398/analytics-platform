import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import type { User, Role, LoginRequest, RegisterRequest } from '@/types'

// Витягує роль для конкретного workspace з workspaceRoles map
function extractRole(user: User | null, workspaceId: string | number | null): Role {
  if (!user?.workspaceRoles || !workspaceId) return 'VIEWER'
  return (user.workspaceRoles[String(workspaceId)] as Role) ?? 'VIEWER'
}

interface AuthState {
  token: string | null
  user: User | null
  currentWorkspaceId: string | null   // активний workspace
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Похідна роль — обчислюється з workspaceRoles[currentWorkspaceId]
  // Зберігаємо для зручності компонентів, але завжди синхронізована
  role: Role | null

  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  switchWorkspace: (workspaceId: string | number) => void
  setRole: (role: Role) => void   // для сумісності зі старим кодом
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      currentWorkspaceId: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.post('/api/auth/login', data, {
            headers: { 'Content-Type': 'application/json' },
          })
          const token: string = response.data.accessToken
          const user: User = response.data.user

          // Визначаємо workspaceId — з відповіді
          const wsIdFromResponse: string | null =
            response.data.workspaceId
              ? String(response.data.workspaceId)
              : null

          const wsRoles = user.workspaceRoles ?? {}
          
          // 1. Шукаємо простір, де користувач є власником (OWNER)
          const ownedWsId = Object.keys(wsRoles).find(id => wsRoles[id] === 'OWNER')
          
          // 2. Якщо такого немає, беремо перший доступний
          const firstWsId = Object.keys(wsRoles)[0] ?? null

          // Пріоритет: ID з відповіді -> Власний простір -> Попередній активний -> Перший-ліпший
          const workspaceId = wsIdFromResponse ?? ownedWsId ?? firstWsId

          const role = extractRole(user, workspaceId)

          set({
            token,
            user,
            currentWorkspaceId: workspaceId,
            role,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err: unknown) {
          const message = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message ?? 'Невірний email або пароль'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.post('/api/auth/register', data, {
            headers: { 'Content-Type': 'application/json' },
          })
          const token: string = response.data.accessToken
          const user: User = response.data.user

          const wsRolesReg = user.workspaceRoles ?? {}
          
          const wsIdFromResponse = response.data.workspaceId
            ? String(response.data.workspaceId)
            : null

          // Шукаємо простір, де користувач є власником (OWNER)
          const ownedWsId = Object.keys(wsRolesReg).find(id => wsRolesReg[id] === 'OWNER')
          const firstWsId = Object.keys(wsRolesReg)[0] ?? null

          const wsId = wsIdFromResponse ?? ownedWsId ?? firstWsId

          const role = extractRole(user, wsId)

          set({
            token,
            user,
            currentWorkspaceId: wsId,
            role,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err: unknown) {
          const message = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message ?? 'Помилка реєстрації. Спробуйте знову.'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      // Перемикання workspace — оновлює роль без повторного логіну
      switchWorkspace: (workspaceId: string | number) => {
        const { user } = get()
        const wsId = String(workspaceId)
        // Примусово оновлюємо і ID, і роль, щоб React-компоненти отримали це одним апдейтом
        set({
          currentWorkspaceId: wsId,
          role: extractRole(user, wsId)
        })
      },

      // Сумісність зі старим кодом
      setRole: (role: Role) => set({ role }),

      logout: () => set({
        token: null,
        user: null,
        currentWorkspaceId: null,
        role: null,
        isAuthenticated: false,
        error: null,
      }),
    }),
    {
      name: 'pulse-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        currentWorkspaceId: state.currentWorkspaceId,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.isAuthenticated = !!state.token
        // Перераховуємо роль при відновленні зі сховища
        if (state.user && state.currentWorkspaceId) {
          state.role = extractRole(state.user, state.currentWorkspaceId)
        }
      },
    }
  )
)