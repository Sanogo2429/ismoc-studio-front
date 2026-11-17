import axios from 'axios'
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
  console.error('VITE_API_BASE_URL est absent du build de production : définissez-le (.env.production ou Vercel).')
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

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
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