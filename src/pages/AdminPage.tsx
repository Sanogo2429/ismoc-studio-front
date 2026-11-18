import { useEffect, useState } from 'react'
import { Phone, PhoneIncoming, Video, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AdminShell, { type AdminTab } from '../components/admin/AdminShell'
import MockupModal from '../components/admin/MockupModal'
import { useAgencyLobby } from '../hooks/useAgencyLobby'
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import { fetchAdminOverview, type AdminOverview, type AdminProject, type ProgressResult } from '../services/adminApi'
import { apiErrorMessage } from '../services/apiError'
import { PROJECT_STEPS, messagePreview, type ClientMessage } from '../services/projectTypes'
import AdminMessagesTab from './admin/AdminMessagesTab'
import ClientsTab from './admin/ClientsTab'
import OrdersTab from './admin/OrdersTab'

const TABS: AdminTab[] = ['orders', 'messages', 'clients']

const HEADINGS: Record<AdminTab, { title: string; subtitle: string }> = {
  orders: { title: 'Commandes & Projets', subtitle: 'Encaissements, livrables développeurs et avancement de chaque projet.' },
  messages: { title: 'Messagerie & Appels Clients', subtitle: 'Conversations temps réel, fichiers et appels audio/vidéo avec vos clients.' },
  clients: { title: 'Clients', subtitle: 'Tous les comptes inscrits et le chiffre d’affaires généré.' },
}

function isAdminTab(value: string | null): value is AdminTab {
  return value !== null && (TABS as string[]).includes(value)
}

/** Back-office agence /admin (réservé au rôle Admin via AdminRoute, vérifié aussi côté API). */
function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: AdminTab = isAdminTab(tabParam) ? tabParam : 'orders'
  const projectParam = searchParams.get('project')

  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [overviewError, setOverviewError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [unreadIds, setUnreadIds] = useState<ReadonlySet<string>>(() => new Set())
  const [mockupProject, setMockupProject] = useState<AdminProject | null>(null)
  const [userName] = useState(() => localStorage.getItem('userName')?.trim() || 'Équipe IsMoc')

  // Écran large : le dossier le plus récent s'ouvre d'office. Écran étroit : la liste d'abord (pas de présélection).
  const isNarrow = useMediaQuery(NARROW_QUERY)
  const selectedProjectId = projectParam ?? (isNarrow ? null : overview?.projects[0]?.projectId ?? null)
  const isViewingConversation = (projectId: string) => activeTab === 'messages' && selectedProjectId === projectId

  useEffect(() => {
    let isActive = true
    fetchAdminOverview()
      .then((data) => { if (isActive) { setOverview(data); setOverviewError('') } })
      .catch((error: unknown) => { if (isActive) setOverviewError(apiErrorMessage(error, 'Impossible de charger le cockpit.')) })
      .finally(() => { if (isActive) setIsRefreshing(false) })
    return () => { isActive = false }
  }, [refreshKey])

  // Lobby agence : aperçus et non-lus mis à jour en direct, alerte des appels entrants de tous les projets.
  const lobby = useAgencyLobby({
    onMessage: (projectId: string, message: ClientMessage) => {
      setOverview((current) => current && ({
        ...current,
        projects: current.projects
          .map((project) => project.projectId !== projectId ? project : {
            ...project,
            messagesCount: project.messagesCount + 1,
            lastActivityAt: message.sentAt,
            lastMessage: { author: message.author, authorName: message.authorName, messageType: message.messageType, content: messagePreview(message), hasAttachment: Boolean(message.attachmentUrl), sentAt: message.sentAt },
          })
          .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()),
      }))
      if (message.author === 'client' && !isViewingConversation(projectId)) {
        setUnreadIds((current) => new Set(current).add(projectId))
      }
    },
    // Après une coupure : rechargement discret du cockpit (aperçus et compteurs manqués), sans indicateur.
    onReconnected: () => setRefreshKey((key) => key + 1),
  })

  function refresh() {
    setIsRefreshing(true)
    setRefreshKey((key) => key + 1)
  }

  function navigateTab(tab: AdminTab) {
    setSearchParams(tab === 'messages' && selectedProjectId ? { tab, project: selectedProjectId } : { tab })
  }

  function openChat(projectId: string) {
    setSearchParams({ tab: 'messages', project: projectId })
    setUnreadIds((current) => {
      if (!current.has(projectId)) return current
      const next = new Set(current)
      next.delete(projectId)
      return next
    })
  }

  function handleProgressPublished(projectId: string, result: ProgressResult) {
    setOverview((current) => current && ({
      ...current,
      projects: current.projects.map((project) => project.projectId !== projectId ? project : {
        ...project,
        status: result.status,
        step: result.step,
        stepLabel: PROJECT_STEPS[result.step - 1] ?? project.stepLabel,
        recentMilestones: [...result.milestones].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
      }),
    }))
    refresh() // recalcule aussi les KPI (projets en codage / livrés)
  }

  const alert = lobby.callAlert && !isViewingConversation(lobby.callAlert.projectId) ? lobby.callAlert : null
  const alertProject = alert ? overview?.projects.find((project) => project.projectId === alert.projectId) : undefined
  const heading = HEADINGS[activeTab]

  return (
    <AdminShell
      active={activeTab}
      isRefreshing={isRefreshing}
      lobbyStatus={lobby.status}
      onNavigate={navigateTab}
      onRefresh={refresh}
      subtitle={heading.subtitle}
      title={heading.title}
      unreadCount={unreadIds.size}
      userName={userName}
    >
      {activeTab === 'orders' && (
        <OrdersTab error={overviewError} onMockup={setMockupProject} onOpenChat={openChat} onProgressPublished={handleProgressPublished} overview={overview} />
      )}
      {activeTab === 'messages' && (
        <AdminMessagesTab onClose={() => setSearchParams({ tab: 'messages' })} onMockup={setMockupProject} onSelect={openChat} projects={overview?.projects ?? null} selectedProjectId={selectedProjectId} unreadIds={unreadIds} />
      )}
      {activeTab === 'clients' && <ClientsTab refreshKey={refreshKey} />}

      {mockupProject && <MockupModal onClose={() => setMockupProject(null)} project={mockupProject} />}

      {/* Appel entrant d'un client alors que sa conversation n'est pas ouverte. */}
      {alert && (
        <div className="fixed left-4 right-4 top-safe-6 z-50 rounded-2xl sm:left-auto sm:right-6 sm:w-[360px] border border-[#F59E0B]/30 bg-[#0E1424] p-5 text-slate-100 shadow-2xl shadow-black/50" role="alertdialog" aria-label="Appel client entrant">
          <div className="flex items-start gap-4">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-[#0B132B]">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#F59E0B]/40" />
              <PhoneIncoming size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{alert.callerName}</p>
              <p className="text-xs text-slate-400">{alert.callType === 'audio' ? 'Appel audio' : 'Appel vidéo'} entrant{alertProject ? ` · #${alertProject.reference}` : ''}</p>
            </div>
            <button aria-label="Ignorer" className="rounded p-1 text-slate-500 hover:text-white" onClick={lobby.dismissCallAlert} type="button"><X size={16} /></button>
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600" onClick={() => openChat(alert.projectId)} type="button">
            {alert.callType === 'audio' ? <Phone size={16} /> : <Video size={16} />} Ouvrir la conversation et répondre
          </button>
        </div>
      )}
    </AdminShell>
  )
}

export default AdminPage
