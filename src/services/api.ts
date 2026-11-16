import axios from 'axios'

/**
 * VITE_API_BASE_URL : URL de l'API en production et dans l'application mobile (Capacitor).
 * « same-origin » (npm run tunnel) : l'API est jointe via le même domaine que le site — le serveur
 * de prévisualisation relaie /api, /hubs et /signin-google vers l'API locale : un seul tunnel suffit.
 */
const configuredApiBase = import.meta.env.VITE_API_BASE_URL
const apiBaseUrl = configuredApiBase === 'same-origin' ? '' : configuredApiBase || 'https://localhost:7060'

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
        localStorage.removeItem('userName')

        if (window.location.pathname !== '/connexion') {
          window.location.assign('/connexion?session=expired')
        }
      }
    }

    return Promise.reject(error)
  },
)