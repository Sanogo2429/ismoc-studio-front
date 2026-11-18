/**
 * Disponibilité du service IsMoc (indépendante du réseau du téléphone) :
 * - « indisponible » quand une requête reste sans réponse alors que le réseau est présent, ou quand l'hébergeur
 *   renvoie une page d'erreur (502 / 503 / 504, ex. réveil du service) ;
 * - une sonde vérifie régulièrement le retour (5 s, puis jusqu'à 30 s) ; « Réessayer » la relance tout de suite ;
 * - au retour, l'événement « ismoc:connection-restored » permet aux pages de recharger leurs données.
 * Les détails techniques vont UNIQUEMENT dans la console ; l'écran n'affiche que des messages simples.
 */

export type ConnectionState = 'available' | 'unavailable'

export const CONNECTION_RESTORED_EVENT = 'ismoc:connection-restored'

const PROBE_DELAYS_MS = [5_000, 10_000, 20_000, 30_000]

let state: ConnectionState = 'available'
let probeTimer: number | null = null
let probeAttempt = 0
let healthUrl = '/health'
const listeners = new Set<() => void>()

function setState(next: ConnectionState) {
  if (state === next) return
  state = next
  listeners.forEach((listener) => listener())
  if (next === 'available') window.dispatchEvent(new Event(CONNECTION_RESTORED_EVENT))
}

/** Adresse de la sonde de disponibilité (appelée une fois par services/api.ts). */
export function configureConnectionMonitor(apiBaseUrl: string): void {
  healthUrl = `${apiBaseUrl}/health`
}

export function getConnectionState(): ConnectionState {
  return state
}

export function subscribeConnectionState(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Une requête a abouti : le service répond. */
export function reportAvailable(): void {
  if (state === 'available') return
  clearProbe()
  probeAttempt = 0
  setState('available')
}

/** Le service ne répond pas (réseau présent) : bandeau + vérifications automatiques. Détail en console uniquement. */
export function reportUnavailable(detail: unknown): void {
  console.warn('[IsMoc] Service injoignable (le réseau est présent) :', detail)
  if (state === 'unavailable') return
  setState('unavailable')
  scheduleProbe()
}

/** Bouton « Réessayer » : vérification immédiate. */
export function retryConnectionNow(): void {
  clearProbe()
  void probe()
}

function clearProbe() {
  if (probeTimer !== null) {
    window.clearTimeout(probeTimer)
    probeTimer = null
  }
}

function scheduleProbe() {
  clearProbe()
  const delay = PROBE_DELAYS_MS[Math.min(probeAttempt, PROBE_DELAYS_MS.length - 1)]
  probeTimer = window.setTimeout(() => void probe(), delay)
}

async function probe() {
  if (state === 'available') return
  // Hors ligne : la vérification attendra le retour du réseau (événement « online »).
  if (!navigator.onLine) return
  probeAttempt += 1
  try {
    const response = await fetch(healthUrl, { cache: 'no-store' })
    if (response.ok) {
      reportAvailable()
      return
    }
    console.warn(`[IsMoc] Vérification de disponibilité : réponse ${response.status}.`)
  } catch (error: unknown) {
    console.warn('[IsMoc] Vérification de disponibilité impossible :', error)
  }
  scheduleProbe()
}

window.addEventListener('online', () => {
  if (state === 'unavailable') retryConnectionNow()
})
