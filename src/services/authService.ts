import { api } from './api'
import { clearSessionCache } from './sessionCache'

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

/**
 * Une réponse « 200 » n'est un succès que si elle contient vraiment un jeton : une page HTML (mauvaise
 * adresse d'API, proxy, page d'erreur d'hébergeur) ne doit jamais être affichée comme une réussite.
 */
function assertAuthResponse(data: unknown, failureMessage: string): AuthResponse {
  const candidate = data as Partial<AuthResponse> | null
  if (!candidate || typeof candidate !== 'object' || typeof candidate.token !== 'string' || candidate.token.split('.').length !== 3) {
    throw new Error(failureMessage)
  }
  return candidate as AuthResponse
}

export async function login(credentials: AuthCredentials): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/api/Auth/login', credentials)
  return assertAuthResponse(response.data, 'Réponse inattendue du serveur : la connexion n’a pas abouti. Réessayez.')
}

export async function register(userData: RegisterUserData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/api/Auth/register', userData)
  return assertAuthResponse(response.data, 'Réponse inattendue du serveur : votre inscription n’a pas été confirmée. Réessayez.')
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/api/auth/forgot-password', { email })
}

/**
 * Départ vers Google : l'éventuelle session précédente (par exemple un compte administrateur sur ce même
 * navigateur) est effacée AVANT, pour qu'un parcours Google annulé ou en échec ne la laisse jamais active.
 * Le rôle de la nouvelle session vient uniquement du jeton signé renvoyé par l'API.
 */
export function startGoogleLogin(): void {
  localStorage.removeItem('token')
  clearSessionCache()
  localStorage.removeItem('userName')
  window.location.assign(getGoogleLoginUrl())
}

export function getGoogleLoginUrl(): string {
  // L'API renverra le client sur ce même site après Google (ordinateur, tunnel, mobile).
  return api.getUri({ url: '/api/auth/google-login', params: { returnUrl: window.location.origin } })
}