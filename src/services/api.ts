import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { configureConnectionMonitor, reportAvailable, reportUnavailable } from './connectionMonitor'
import { clearSessionCache } from './sessionCache'

/**
 * VITE_API_BASE_URL : URL de l'API (appels HTTP, temps réel SignalR, connexion Google).
 * - .env.production : API de production sur Render (build Vercel et application mobile Capacitor) ;
 * - .env.development / .env : API locale (https://localhost:7060) ;
 * - « same-origin » (npm run tunnel) : l'API est jointe via le même domaine que le site — le serveur
 *   de prévisualisation relaie /api, /hubs et /signin-google vers l'API locale : un seul tunnel suffit.
 * Une variable VITE_API_BASE_URL définie chez l'hébergeur (Vercel) prime sur les fichiers .env.
 */
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')
const apiBaseUrl = configuredApiBase === 'same-origin'
  ? ''
  : configuredApiBase || (import.meta.env.DEV ? 'https://localhost:7060' : '')

if (import.meta.env.PROD && !configuredApiBase) {
  console.error('VITE_API_BASE_URL est absent du build de production : définissez-le (.env.production ou Vercel).')
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

configureConnectionMonitor(apiBaseUrl)

/** Nouvelles tentatives automatiques des lectures (GET) quand le service ne répond pas : 1 s, 3 s, 6 s. */
const READ_RETRY_DELAYS_MS = [1_000, 3_000, 6_000]

type RetriableConfig = InternalAxiosRequestConfig & { ismocRetry?: number }

/**
 * Service injoignable alors que le réseau est présent : aucune réponse, ou page d'erreur de l'hébergeur
 * (502 / 503 / 504 sans message de l'application — un 503 « IA indisponible » de l'API reste une réponse métier).
 */
function isServiceUnavailable(error: AxiosError): boolean {
  if (!navigator.onLine) return false
  if (!error.response) return error.code !== 'ERR_CANCELED'
  const data = error.response.data as { message?: unknown; Message?: unknown } | null
  const hasAppMessage = !!data && typeof data === 'object' && (data.message !== undefined || data.Message !== undefined)
  return [502, 503, 504].includes(error.response.status) && !hasAppMessage
}

api.interceptors.response.use(
  (response) => {
    reportAvailable()
    return response
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error) && isServiceUnavailable(error)) {
      // Détail technique : console uniquement (jamais affiché).
      reportUnavailable({ url: error.config?.url, method: error.config?.method, status: error.response?.status, code: error.code, message: error.message })
      const config = error.config as RetriableConfig | undefined
      const attempt = config?.ismocRetry ?? 0
      if (config && (config.method ?? 'get').toLowerCase() === 'get' && attempt < READ_RETRY_DELAYS_MS.length) {
        config.ismocRetry = attempt + 1
        await new Promise((resolve) => window.setTimeout(resolve, READ_RETRY_DELAYS_MS[attempt]))
        return api.request(config)
      }
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? ''
      const isAuthRequest = /\/api\/auth\/(login|register|google-login|google-callback)/i.test(requestUrl)

      if (!isAuthRequest) {
        localStorage.removeItem('token')
        clearSessionCache()
        localStorage.removeItem('userName')

        if (window.location.pathname !== '/connexion') {
          window.location.assign('/connexion?session=expired')
        }
      }
    }

    return Promise.reject(error)
  },
)