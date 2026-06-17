import api from '@/lib/axios'
import type { LoginRequest, RegisterRequest, AuthResponse } from '@/types'

interface BackendAuthResponse {
  token: string
  user: AuthResponse['user']
}

function toAuthResponse(raw: BackendAuthResponse): AuthResponse {
  return {
    accessToken: raw.token,
    tokenType: 'Bearer',
    user: raw.user,
  }
}

export const authApi = {
  login: (data: LoginRequest): Promise<AuthResponse> =>
    api.post<BackendAuthResponse>('/auth/login', data)
      .then((r) => toAuthResponse(r.data)),

  register: (data: RegisterRequest): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/register', data)
      .then((r) => r.data),

  verifyEmail: (token: string): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/verify-email', { token })
      .then((r) => r.data),
      
  me: () =>
    api.get<AuthResponse['user']>('/auth/me').then((r) => r.data),

  requestPasswordReset: (email: string): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/forgot-password', { email })
      .then((r) => r.data),

  resetPassword: (token: string, newPassword: string): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword })
      .then((r) => r.data),


}



