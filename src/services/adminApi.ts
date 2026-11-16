import { api } from './api'
import type { ClientMessage, Installment, ProjectMilestone, ProjectStatus, ThreadType } from './projectTypes'

export interface AdminStats {
  totalRevenueEur: number
  pendingInstallmentsEur: number
  activeProjectsCount: number
  deliveredProjectsCount: number
  awaitingPaymentCount: number
  totalProjectsCount: number
  totalClientsCount: number
}

export interface AdminProject {
  projectId: string
  threadType?: ThreadType
  reference: string
  title: string
  type: 'Web' | 'Mobile'
  format: 'web' | 'mobile'
  status: ProjectStatus
  paymentStatus: 'paid' | 'pending' | 'draft'
  step: number
  stepLabel: string
  initialIdea: string
  createdAt: string
  lastActivityAt: string
  hasDeliverable: boolean
  order: {
    invoiceNumber: string
    totalEur: number
    paidEur: number
    pendingEur: number
    maintenancePlan: 'none' | 'monthly' | 'annual'
    maintenanceAmountEur: number
    maintenancePeriod: string | null
    paymentMethod: string | null
    paymentDetail: string | null
    cardLast4: string | null
    orderedAt: string
    paidAt: string | null
    installments: Installment[]
  } | null
  recentMilestones: ProjectMilestone[]
  lastMessage: { author: ClientMessage['author']; authorName: string; messageType?: ClientMessage['messageType']; content: string; hasAttachment: boolean; sentAt: string } | null
  messagesCount: number
  client: { clientId: number | null; fullName: string; email: string; phoneNumber: string }
}

export interface AdminOverview {
  stats: AdminStats
  projects: AdminProject[]
}

export interface AdminClient {
  clientId: number
  fullName: string
  email: string
  phoneNumber: string
  role: string
  registeredAt: string
  projectsCount: number
  paidProjectsCount: number
  revenueEur: number
  committedEur: number
  lastActivityAt: string | null
}

export interface ProgressResult {
  status: ProjectStatus
  step: number
  milestones: ProjectMilestone[]
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  return (await api.get<AdminOverview>('/api/Projects/admin/overview')).data
}

export async function fetchAdminClients(): Promise<AdminClient[]> {
  return (await api.get<AdminClient[]>('/api/Projects/admin/clients')).data
}

export async function publishProgress(projectId: string, payload: { step: number | null; title: string; description: string }): Promise<ProgressResult> {
  return (await api.post<ProgressResult>(`/api/Projects/${encodeURIComponent(projectId)}/progress`, payload)).data
}

/** Télécharge le Pack Dev (design-valide.html + cahier-des-charges.json) en .zip. */
export async function downloadDevPack(project: Pick<AdminProject, 'projectId' | 'reference'>): Promise<void> {
  const response = await api.get<Blob>(`/api/Projects/${encodeURIComponent(project.projectId)}/deliverable`, {
    params: { download: true },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `ismoc-${project.reference.toLowerCase()}-pack-dev.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function fetchMockupHtml(projectId: string): Promise<string> {
  const response = await api.get<{ currentHtml: string }>(`/api/Projects/${encodeURIComponent(projectId)}/memory`)
  return response.data.currentHtml
}
