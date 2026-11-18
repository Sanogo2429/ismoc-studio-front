import { api } from './api'

interface SignedLink {
  url: string
  expiresAt: string
}

/** Marge avant expiration : un lien qui expire dans moins d'une minute est redemandé. */
const EXPIRY_MARGIN_MS = 60_000
const cache = new Map<string, { url: string; expiresAt: number }>()

/**
 * Lien signé temporaire (10 min) vers une pièce jointe privée. L'API vérifie les droits sur le projet avant de le
 * délivrer ; le fichier est ensuite lu directement (Supabase Storage), sans jeton de connexion dans l'URL.
 * @param attachmentUrl adresse permanente enregistrée dans le message (/api/Projects/{id}/attachments/{fichier})
 * @param download true : le fichier est servi en téléchargement sous son nom original
 */
export async function getAttachmentLink(attachmentUrl: string, { download = false, fresh = false } = {}): Promise<string> {
  const key = `${attachmentUrl}|${download ? 'd' : 'v'}`
  const cached = cache.get(key)
  if (!fresh && cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.url

  const response = await api.get<SignedLink>(`${attachmentUrl}/link`, { params: download ? { download: true } : undefined })
  const expiresAt = new Date(response.data.expiresAt).getTime()
  cache.set(key, { url: response.data.url, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 5 * 60_000 })
  return response.data.url
}

/** Télécharge une pièce jointe sous son nom original (iPhone compris : passage par un blob local). */
export async function downloadAttachment(attachmentUrl: string, name: string): Promise<void> {
  const link = await getAttachmentLink(attachmentUrl, { download: true })
  const response = await fetch(link)
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status})`)
  const href = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
