import { api } from './api'

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterUserData extends AuthCredentials {
  firstName: string
  lastName: string
  phoneNumber: string
}

export interface AuthResponse {
  token: string
  email: string
  fullName: string
  role: string
}

export async function login(credentials: AuthCredentials): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/api/Auth/login', credentials)
  return response.data
}

export async function register(userData: RegisterUserData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/api/Auth/register', userData)
  return response.data
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/api/auth/forgot-password', { email })
}

export function getGoogleLoginUrl(): string {
  // L'API renverra le client sur ce même site après Google (ordinateur, tunnel, mobile).
  return api.getUri({ url: '/api/auth/google-login', params: { returnUrl: window.location.origin } })
}