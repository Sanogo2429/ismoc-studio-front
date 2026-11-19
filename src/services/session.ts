/**
 * Lecture de la session à partir du JWT stocké.
 * ⚠ Sert uniquement à l'affichage et à la navigation : les droits sont toujours vérifiés par le backend.
 */

const ROLE_CLAIMS = ['role', 'roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function readTokenPayload(token = localStorage.getItem('token')): Record<string, unknown> | null {
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(payload))
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

/** Jeton présent et non expiré. */
export function hasValidSession(): boolean {
  const payload = readTokenPayload()
  if (!payload) return false
  const exp = typeof payload.exp === 'number' ? payload.exp : null
  return exp === null || exp * 1000 > Date.now()
}

export function getUserRoles(): string[] {
  const payload = readTokenPayload()
  if (!payload) return []
  return ROLE_CLAIMS.flatMap((claim) => {
    const value = payload[claim]
    if (typeof value === 'string') return [value]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  })
}

/**
 * Nom complet affiché (en-têtes, menus, factures) : celui mémorisé à la connexion, sinon prénom + nom du jeton,
 * sinon fallback. Évite « Client » dans l'en-tête quand la page salue déjà la personne par son prénom.
 */
export function getDisplayName(fallback: string): string {
  const stored = localStorage.getItem('userName')?.trim()
  if (stored) return stored
  const payload = readTokenPayload()
  const fromToken = [payload?.given_name, payload?.family_name].filter((part): part is string => typeof part === 'string' && Boolean(part.trim())).join(' ').trim()
  return fromToken || fallback
}

/** Prénom seul pour saluer l'utilisateur : claim « given_name » du jeton, sinon premier mot du nom affiché. */
export function getFirstName(fallbackFullName = ''): string {
  const givenName = readTokenPayload()?.given_name
  if (typeof givenName === 'string' && givenName.trim()) return givenName.trim()
  return fallbackFullName.trim().split(/\s+/)[0] ?? ''
}

/** Session ouverte avec Google (claim « amr » posé par l'API) : pas de mot de passe IsMoc connu de l'utilisateur. */
export function isGoogleSession(): boolean {
  const amr = readTokenPayload()?.amr
  return amr === 'google' || (Array.isArray(amr) && amr.includes('google'))
}

export function isAdmin(): boolean {
  return getUserRoles().some((role) => role.toLowerCase() === 'admin')
}

/**
 * Page d'arrivée après une connexion (e-mail, Google, après réinitialisation), selon le rôle porté par le JWT :
 * cockpit agence /admin pour un administrateur (ex. sanogomohamedismael47@gmail.com, AdminEmails côté API),
 * « Mon espace » /dashboard pour un client. /admin reste protégé par AdminRoute et [Authorize(Roles = "Admin")].
 */
export function postLoginPath(): string {
  const next = takeNextPath()
  if (next) return next
  return isAdmin() ? '/admin' : '/dashboard'
}

/**
 * Destination demandée avant la connexion (ex. /configurator?secteur=sante), gardée dans sessionStorage pour
 * survivre à l'aller-retour Google. Chemins internes uniquement : jamais d'URL externe (« //… », « /\… »).
 */
const NEXT_PATH_KEY = 'ismoc-next-path'

function isSafeNextPath(path: string | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
    && !/^\/(connexion|inscription|login)\b/.test(path)
}

export function rememberNextPath(path: string | null): void {
  if (!isSafeNextPath(path)) return
  try { sessionStorage.setItem(NEXT_PATH_KEY, path) } catch { /* stockage indisponible : retour à la page par défaut */ }
}

function takeNextPath(): string | null {
  try {
    const path = sessionStorage.getItem(NEXT_PATH_KEY)
    sessionStorage.removeItem(NEXT_PATH_KEY)
    return isSafeNextPath(path) ? path : null
  } catch {
    return null
  }
}

/** Lien de connexion qui ramène ensuite à `next`. */
export function loginPathFor(next: string): string {
  return `/connexion?suite=${encodeURIComponent(next)}`
}
