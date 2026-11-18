export type ProjectStatus = 'draft' | 'ordered' | 'in_development' | 'delivered' | 'maintenance'
export type MaintenancePlanId = 'none' | 'monthly' | 'annual'

export interface Installment {
  label: string
  amountEur: number
  status: 'paid' | 'pending'
  paidAt?: string | null
}

export interface ProjectOrder {
  invoiceNumber: string
  maintenancePlan: MaintenancePlanId
  maintenanceAmountEur: number
  maintenancePeriod: string | null
  developmentPriceEur: number
  designIdentityPriceEur: number
  projectTotalEur: number
  installments: Installment[]
  paymentMethod?: string | null
  paymentDetail?: string | null
  cardLast4?: string | null
  orderedAt: string
  paidAt?: string | null
}

export interface ProjectMilestone {
  title: string
  description: string
  date: string
}

export interface ProjectQuote {
  complexityLevel: string
  developmentPriceEur: number
  designIdentityPriceEur: number
  monthlyMaintenanceEur: number
  estimatedDays: number
  screens: string[]
  features: string[]
}

export interface ClientMessage {
  id: string
  author: 'client' | 'team' | 'system'
  authorName: string
  content: string
  sentAt: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentContentType?: string | null
  messageType?: ClientMessageType
  audioDurationSeconds?: number | null
}

/** 'missed_call' : message système ajouté par le serveur (content = 'audio' | 'video', authorName = l'appelant). */
export type ClientMessageType = 'text' | 'image' | 'file' | 'sticker' | 'voice' | 'missed_call'
export type ThreadType = 'project' | 'general'

/** Fil « Discussion générale · Avant-projet » (ouvert dès l'inscription, sans maquette). */
export function isGeneralThread(item: { threadType?: ThreadType | string | null }): boolean {
  return item.threadType === 'general'
}

/** Aperçu court d'un message (listes de conversations). */
export function messagePreview(message: Pick<ClientMessage, 'messageType' | 'content' | 'attachmentName' | 'audioDurationSeconds'>): string {
  switch (message.messageType) {
    case 'sticker': return `Sticker · ${message.attachmentName ?? message.content}`
    case 'voice': return `🎙️ Message vocal (${message.audioDurationSeconds ?? 0} s)`
    case 'missed_call': return message.content === 'video' ? '📞 Appel vidéo manqué' : '📞 Appel audio manqué'
    case 'image': return message.content || '📷 Photo'
    case 'file': return message.content || `📎 ${message.attachmentName ?? 'Fichier'}`
    default: return message.content
  }
}

export interface ProjectSummary {
  projectId: string
  threadType?: ThreadType
  projectName: string
  format: 'web' | 'mobile'
  status: ProjectStatus
  initialIdea: string
  totalEur?: number | null
  order?: ProjectOrder | null
  createdAt: string
  updatedAt: string
}

/** Référence courte affichée partout : #ISM-XXXX. */
export function projectCode(projectId: string): string {
  return `ISM-${projectId.slice(0, 4).toUpperCase()}`
}

export const PROJECT_STEPS = ['Brief validé', 'Payé', 'En cours de codage', 'Livré', 'Maintenance'] as const

/** Étape courante sur 5 (1 = brief, 5 = maintenance) et libellé affiché. */
export function projectStep(status: ProjectStatus): { index: number; label: string } {
  switch (status) {
    case 'ordered': return { index: 1, label: 'Brief validé · paiement en attente' }
    case 'in_development': return { index: 3, label: 'En cours de codage' }
    case 'delivered': return { index: 4, label: 'Livré' }
    case 'maintenance': return { index: 5, label: 'Maintenance' }
    default: return { index: 1, label: 'Maquette en conception' }
  }
}

export function paymentStatusLabel(status: ProjectStatus): { label: string; tone: 'green' | 'amber' | 'slate' } {
  if (isPaid(status)) return { label: 'Payé', tone: 'green' }
  if (status === 'ordered') return { label: 'Paiement en attente', tone: 'amber' }
  return { label: 'Brouillon', tone: 'slate' }
}

export function maintenanceLabel(order: Pick<ProjectOrder, 'maintenancePlan' | 'maintenanceAmountEur' | 'maintenancePeriod'>): string {
  if (order.maintenancePlan === 'none') return 'Sans maintenance'
  const plan = order.maintenancePlan === 'annual' ? 'Annuelle' : 'Mensuelle'
  return `${plan} · ${formatEuros(order.maintenanceAmountEur)} / ${order.maintenancePeriod ?? (order.maintenancePlan === 'annual' ? 'an' : 'mois')}`
}

export const PAID_STATUSES: ProjectStatus[] = ['in_development', 'delivered', 'maintenance']

export function isPaid(status: string | undefined): boolean {
  return PAID_STATUSES.includes(status as ProjectStatus)
}

export function formatEuros(value: number): string {
  const hasCents = Math.round(value * 100) % 100 !== 0
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value: string | undefined | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', options)
}

export function projectTypeLabel(format: string | undefined): string {
  return format === 'mobile' ? 'Application mobile' : 'Site web'
}
