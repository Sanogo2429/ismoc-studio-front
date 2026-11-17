import { readTokenPayload } from './session'

/**
 * Cache « stale-while-revalidate » de l'onglet : la dernière version connue (projets, messages) s'affiche
 * instantanément, puis la réponse fraîche de l'API la remplace. Évite l'écran vide et les requêtes en cascade
 * (projets → conversation → messages) à chaque retour sur une page, surtout quand l'API Render se réveille.
 *
 * Confidentialité : sessionStorage (propre à l'onglet, effacé à sa fermeture), clés préfixées par l'identifiant
 * du compte connecté (aucun mélange entre comptes sur un même navigateur), vidé à la déconnexion.
 */

const PREFIX = 'ismoc-cache:'
const memory = new Map<string, unknown>()

function userScope(): string | null {
  const payload = readTokenPayload()
  const id = payload?.nameid ?? payload?.sub ?? payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function fullKey(key: string): string | null {
  const scope = userScope()
  return scope ? `${PREFIX}${scope}:${key}` : null
}

export function readCache<T>(key: string): T | undefined {
  const storageKey = fullKey(key)
  if (!storageKey) return undefined
  if (memory.has(storageKey)) return memory.get(storageKey) as T
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (raw === null) return undefined
    const value = JSON.parse(raw) as T
    memory.set(storageKey, value)
    return value
  } catch {
    return undefined
  }
}

export function writeCache<T>(key: string, value: T): void {
  const storageKey = fullKey(key)
  if (!storageKey) return
  memory.set(storageKey, value)
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Quota dépassé ou stockage indisponible (navigation privée) : le cache mémoire suffit.
  }
}

/**
 * Petites préférences de navigation durables (ex. identifiant de la dernière conversation ouverte) :
 * localStorage, partagé entre onglets, préfixé par le compte. Jamais de contenu (messages, projets).
 */
export function readPreference(key: string): string | undefined {
  const storageKey = fullKey(key)
  if (!storageKey) return undefined
  try { return localStorage.getItem(storageKey) ?? undefined } catch { return undefined }
}

export function writePreference(key: string, value: string): void {
  const storageKey = fullKey(key)
  if (!storageKey) return
  try { localStorage.setItem(storageKey, value) } catch { /* stockage indisponible */ }
}

/** Déconnexion / session expirée : plus aucune donnée du compte dans l'onglet. */
export function clearSessionCache(): void {
  memory.clear()
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key)
  } catch {
    // stockage indisponible
  }
}
