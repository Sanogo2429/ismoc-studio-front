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

export function isAdmin(): boolean {
  return getUserRoles().some((role) => role.toLowerCase() === 'admin')
}

/**
 * Page d'arrivée après une connexion (e-mail, Google, après réinitialisation), selon le rôle porté par le JWT :
 * cockpit agence /admin pour un administrateur (ex. sanogomohamedismael47@gmail.com, AdminEmails côté API),
 * « Mon espace » /dashboard pour un client. /admin reste protégé par AdminRoute et [Authorize(Roles = "Admin")].
 */
export function postLoginPath(): string {
  return isAdmin() ? '/admin' : '/dashboard'
}
