import axios from 'axios'

interface ApiErrorBody {
  message?: string
  Message?: string
  title?: string
  Title?: string
}

/** Extrait le message d'erreur renvoyé par le backend .NET, sinon retourne `fallback`. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      return data.message || data.Message || data.title || data.Title || fallback
    }
    if (!error.response) {
      return 'Impossible de joindre le serveur IsMoc. Vérifiez que le backend est démarré.'
    }
  }
  return fallback
}
