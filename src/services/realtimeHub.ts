import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { api } from './api'

export type HubStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const HUB_PATH = '/hubs/project-communication'
/** Délais entre deux tentatives : rapides d'abord, puis une tentative toutes les 30 s, sans limite. */
const RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000, 20_000]
const MAX_RETRY_DELAY_MS = 30_000

interface ResilientHubOptions {
  /** Abonnements (connection.on…) déclarés avant le premier démarrage. */
  configure: (connection: HubConnection) => void
  onStatus: (status: HubStatus) => void
  /**
   * Appelé à chaque connexion établie : rejoindre les salles (le serveur les oublie à chaque nouvelle
   * connexion) et, après une coupure (isReconnect), récupérer ce qui a été manqué entre-temps.
   */
  onConnected: (isReconnect: boolean) => unknown
}

export interface ResilientHub {
  connection: HubConnection
  dispose: () => Promise<void>
}

function retryDelay(attempt: number): number {
  return RETRY_DELAYS_MS[attempt] ?? MAX_RETRY_DELAY_MS
}

/** Jeton absent ou expiré : inutile d'insister, une nouvelle connexion à l'application est nécessaire. */
function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && /\b401\b|unauthorized/i.test(error.message)
}

/**
 * Connexion SignalR (WSS en HTTPS) qui ne s'abandonne jamais tant que la page est ouverte :
 * - premier démarrage réessayé (réveil de l'API Render après une période d'inactivité) ;
 * - reconnexion automatique sans limite de tentatives (veille du téléphone, passage Wi-Fi ↔ 4G) ;
 * - reprise immédiate au retour du réseau ou quand l'application revient au premier plan ;
 * - arrêt propre si le jeton est refusé (401).
 */
export function connectResilientHub({ configure, onStatus, onConnected }: ResilientHubOptions): ResilientHub {
  let disposed = false
  let unauthorized = false
  let starting = false
  let attempt = 0
  let retryTimer: number | null = null

  const connection = new HubConnectionBuilder()
    .withUrl(`${api.defaults.baseURL ?? ''}${HUB_PATH}`, { accessTokenFactory: () => localStorage.getItem('token') ?? '' })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (context) =>
        disposed || isUnauthorized(context.retryReason) ? null : retryDelay(context.previousRetryCount),
    })
    .configureLogging(LogLevel.Warning)
    .build()

  configure(connection)

  function notifyConnected(isReconnect: boolean) {
    attempt = 0
    onStatus('connected')
    void Promise.resolve()
      .then(() => onConnected(isReconnect))
      .catch(() => undefined)
  }

  function clearRetry() {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  function scheduleStart(isReconnect: boolean) {
    if (disposed || unauthorized || retryTimer !== null) return
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      void start(isReconnect)
    }, retryDelay(attempt))
  }

  async function start(isReconnect: boolean) {
    if (disposed || unauthorized || starting || connection.state !== HubConnectionState.Disconnected) return
    starting = true
    try {
      await connection.start()
      if (!disposed) notifyConnected(isReconnect)
    } catch (error: unknown) {
      if (disposed) return
      if (isUnauthorized(error)) {
        unauthorized = true
        onStatus('disconnected')
        return
      }
      attempt += 1
      onStatus(isReconnect ? 'reconnecting' : 'connecting')
      scheduleStart(isReconnect)
    } finally {
      starting = false
    }
  }

  connection.onreconnecting(() => {
    if (!disposed) onStatus('reconnecting')
  })
  connection.onreconnected(() => {
    if (!disposed) notifyConnected(true)
  })
  // Fin de la reconnexion automatique (jeton refusé, ou cas imprévu) : on relance nous-mêmes si possible.
  connection.onclose((error) => {
    if (disposed) return
    if (isUnauthorized(error)) unauthorized = true
    onStatus(unauthorized ? 'disconnected' : 'reconnecting')
    scheduleStart(true)
  })

  // Retour du réseau ou de l'application au premier plan : nouvelle tentative sans attendre le délai.
  function wake() {
    if (disposed || unauthorized || document.visibilityState === 'hidden') return
    if (connection.state !== HubConnectionState.Disconnected) return
    clearRetry()
    attempt = 0
    void start(true)
  }
  window.addEventListener('online', wake)
  document.addEventListener('visibilitychange', wake)

  onStatus('connecting')
  void start(false)

  return {
    connection,
    dispose: async () => {
      disposed = true
      clearRetry()
      window.removeEventListener('online', wake)
      document.removeEventListener('visibilitychange', wake)
      await connection.stop().catch(() => undefined)
    },
  }
}
