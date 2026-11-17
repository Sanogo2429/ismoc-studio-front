import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ClientShell from '../components/ClientShell'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { CLIENT_NAV_IDS, DASHBOARD_CHAT_INPUT_ID, type ClientNavId } from '../services/clientNavigation'
import type { ProjectSummary } from '../services/projectTypes'
import { isAdmin } from '../services/session'
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

  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
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
    api.get<ProjectSummary[]>('/api/Projects/studio')
      .then((response) => { if (isActive) setProjects(response.data) })
      .catch((error: unknown) => {
        if (!isActive) return
        setProjects([])
        setProjectsError(apiErrorMessage(error, 'Impossible de charger vos projets.'))
      })
    return () => { isActive = false }
  }, [])

  function openTab(tab: ClientNavId, extra: Record<string, string> = {}) {
    setSearchParams({ tab, ...extra })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
