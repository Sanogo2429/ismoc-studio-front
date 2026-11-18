import axios from 'axios'

interface ApiErrorBody {
  message?: string
  Message?: string
  title?: string
  Title?: string
}

/**
 * Message à afficher pour une erreur d'appel : le message métier renvoyé par l'application, sinon `fallback`.
 * Jamais de détail technique à l'écran : il est écrit dans la console.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response || error.response.status >= 500) {
      console.error('[IsMoc] Échec d\'appel :', { url: error.config?.url, status: error.response?.status, code: error.code, message: error.message, data: error.response?.data })
    }
    const data = error.response?.data
    if (data && typeof data === 'object') {
      return data.message || data.Message || data.title || data.Title || fallback
    }
    if (!error.response) {
      return 'Connexion momentanément indisponible. Réessayez dans un instant.'
    }
  }
  return fallback
}
