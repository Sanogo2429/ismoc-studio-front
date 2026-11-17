import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ClientShell from '../components/ClientShell'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { CLIENT_NAV_IDS, DASHBOARD_CHAT_INPUT_ID, type ClientNavId } from '../services/clientNavigation'
import type { ProjectSummary } from '../services/projectTypes'
import { isAdmin } from '../services/session'
import { readCache, readPreference, writeCache } from '../services/sessionCache'
import { LAST_CONVERSATION_KEY, prefetchMessages } from '../hooks/useProjectRtc'
import BillingTab from './dashboard/BillingTab'
import MessagesTab from './dashboard/MessagesTab'
import ProjectsTab from './dashboard/ProjectsTab'
import SettingsTab from './dashboard/SettingsTab'

function isNavId(value: string | null): value is ClientNavId {
  return value !== null && (CLIENT_NAV_IDS as string[]).includes(value)
}

/**
 * Espace client : Mes projets, Messages (SignalR + WebRTC), Facturation (€) et Paramètres.
 * L'onglet actif est porté par l'URL (?tab=…) pour que les autres pages puissent y renvoyer.
 */
function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: ClientNavId = isNavId(tabParam) ? tabParam : 'projects'
  const selectedProjectId = searchParams.get('project')
  const [activeTabOnMount] = useState(activeTab)

  // Dernière liste connue affichée immédiatement (cache de l'onglet), puis rafraîchie par l'API.
  const [projects, setProjects] = useState<ProjectSummary[] | null>(() => readCache<ProjectSummary[]>('projects') ?? null)
  const [projectsError, setProjectsError] = useState('')
  const [userName, setUserName] = useState(() => localStorage.getItem('userName')?.trim() || 'Client')

  // Compte promu Admin depuis sa dernière connexion : on récupère un jeton à jour (rôle Admin) SANS quitter
  // l'espace client — « Mon espace » reste ici ; le cockpit s'ouvre via le bouton « Cockpit Agence ».
  useEffect(() => {
    let isActive = true
    api.get<{ role: string; token?: string }>('/api/Auth/me')
      .then((response) => {
        if (!isActive || response.data.role !== 'Admin' || isAdmin() || !response.data.token) return
        localStorage.setItem('token', response.data.token)
      })
      .catch(() => undefined)
    return () => { isActive = false }
  }, [])

  useEffect(() => {
    let isActive = true
    // Première visite de Messages (pas encore de projets en cache) : l'historique de la dernière conversation
    // ouverte part EN PARALLÈLE de la liste des projets, au lieu d'attendre celle-ci (requêtes en cascade).
    const lastConversation = readPreference(LAST_CONVERSATION_KEY)
    if (activeTabOnMount === 'messages' && !readCache('projects') && lastConversation) prefetchMessages(lastConversation)

    api.get<ProjectSummary[]>('/api/Projects/studio')
      .then((response) => {
        writeCache('projects', response.data)
        if (isActive) { setProjects(response.data); setProjectsError('') }
      })
      .catch((error: unknown) => {
        if (!isActive) return
        // Liste déjà affichée depuis le cache : on la garde plutôt que d'afficher une page vide.
        setProjects((current) => current ?? [])
        if (!readCache('projects')) setProjectsError(apiErrorMessage(error, 'Impossible de charger vos projets.'))
      })
    return () => { isActive = false }
  }, [activeTabOnMount])

  function openTab(tab: ClientNavId, extra: Record<string, string> = {}) {
    setSearchParams({ tab, ...extra })
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  function writeToTeam() {
    openTab('messages', selectedProjectId ? { project: selectedProjectId } : {})
    // Le champ existe après le rendu de l'onglet Messages.
    window.setTimeout(() => document.getElementById(DASHBOARD_CHAT_INPUT_ID)?.focus(), 250)
  }

  return (
    <ClientShell
      active={activeTab}
      // Messages sur téléphone : écran plein (seule la conversation défile, barre de saisie fixe en bas).
      fillViewport={activeTab === 'messages' && (projects?.length ?? 0) > 0}
      onHelp={writeToTeam}
      onNavigate={(tab) => openTab(tab)}
      userName={userName}
    >
      {activeTab === 'projects' && <ProjectsTab error={projectsError} projects={projects} userName={userName} />}
      {activeTab === 'messages' && (
        <MessagesTab
          onSelectProject={(projectId) => openTab('messages', { project: projectId })}
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
      )}
      {activeTab === 'billing' && <BillingTab projects={projects} />}
      {activeTab === 'settings' && <SettingsTab onProfileUpdated={setUserName} />}
    </ClientShell>
  )
}

export default DashboardPage
