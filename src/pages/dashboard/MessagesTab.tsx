import { ArrowRight, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import NewProjectLink from '../../components/NewProjectLink'
import { ConversationSkeleton } from '../../components/Skeleton'
import { Link } from 'react-router-dom'
import CallOverlay from '../../components/CallOverlay'
import { ChatPanel, ConnectionIndicator } from '../../components/ProjectChat'
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { useProjectRtc } from '../../hooks/useProjectRtc'
import { DASHBOARD_CHAT_INPUT_ID, defaultConversationProject } from '../../services/clientNavigation'
import { formatDate, isGeneralThread, isPaid, projectCode, projectStep, type ClientMessage, type ProjectSummary } from '../../services/projectTypes'
import { readCache } from '../../services/sessionCache'

interface MessagesTabProps {
  projects: ProjectSummary[] | null
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
  /** Téléphone : retour de la conversation plein écran vers la liste. */
  onCloseConversation: () => void
}

const SUBTITLE = 'Échangez en direct avec Ismael, Moctar et l’équipe de développement.'

/**
 * Messages. Téléphone : liste des conversations → conversation plein écran (un seul défilement, barre de saisie
 * collée au clavier). Écran large : sélecteur de projet + conversation côte à côte (inchangé).
 */
function MessagesTab({ onCloseConversation, onSelectProject, projects, selectedProjectId }: MessagesTabProps) {
  const isPhone = useMediaQuery(PHONE_QUERY)

  if (projects === null) {
    return <ConversationSkeleton />
  }

  if (projects.length === 0) {
    return (
      <>
        <PageHeader subtitle={SUBTITLE} title="Messages" />
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-bold">Pas encore de conversation</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">La messagerie et les appels audio/vidéo avec l’équipe IsMoc s’ouvrent dès votre premier projet.</p>
          <NewProjectLink className="mt-6" />
        </div>
      </>
    )
  }

  if (isPhone) {
    const opened = projects.find((project) => project.projectId === selectedProjectId)
    return opened
      // key : nouvelle connexion SignalR (salle) à chaque changement de conversation.
      ? <ProjectConversation immersive key={opened.projectId} onBack={onCloseConversation} project={opened} />
      : <ConversationList onSelect={onSelectProject} projects={projects} />
  }

  const selected = projects.find((project) => project.projectId === selectedProjectId) ?? defaultConversationProject(projects)!

  return (
    <div>
      <PageHeader
        actions={projects.length > 1 ? (
          <label className="block w-full sm:w-80">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-slate-500">Projet</span>
            <select className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100" onChange={(event) => onSelectProject(event.target.value)} value={selected.projectId}>
              {projects.map((project) => <option key={project.projectId} value={project.projectId}>{isGeneralThread(project) ? `💬 ${project.projectName}` : `#${projectCode(project.projectId)} · ${project.projectName}`}</option>)}
            </select>
          </label>
        ) : undefined}
        subtitle={SUBTITLE}
        title="Messages"
      />
      {/* key : nouvelle connexion SignalR (salle) à chaque changement de projet. */}
      <ProjectConversation key={selected.projectId} project={selected} />
    </div>
  )
}

/** Téléphone : liste des conversations (une par projet + la discussion générale). */
function ConversationList({ onSelect, projects }: { onSelect: (projectId: string) => void; projects: ProjectSummary[] }) {
  const ordered = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return (
    <>
      <PageHeader subtitle={SUBTITLE} title="Messages" />
      <ul className="mt-8 space-y-3" aria-label="Conversations">
        {ordered.map((project) => {
          const general = isGeneralThread(project)
          // Aperçu du dernier message s'il est déjà connu (cache de l'onglet) ; sinon l'étape du projet.
          const last = readCache<ClientMessage[]>(`messages:${project.projectId}`)?.at(-1)
          const preview = last
            ? `${last.author === 'client' ? 'Vous : ' : ''}${last.messageType === 'voice' ? 'Note vocale' : last.messageType === 'sticker' ? 'Sticker' : last.content || 'Pièce jointe'}`
            : general ? 'Posez vos questions avant de démarrer' : projectStep(project.status).label
          return (
            <li key={project.projectId}>
              <button className="flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-left transition hover:border-slate-300" onClick={() => onSelect(project.projectId)} type="button">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0B132B] to-[#3A506B] text-[13px] font-bold text-white">{general ? '💬' : projectCode(project.projectId).slice(4, 6)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-bold">{project.projectName}</span>
                    <span className="shrink-0 text-[12px] text-slate-500">{formatDate(project.updatedAt, { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-slate-500">{preview}</span>
                </span>
                <ChevronRight className="shrink-0 text-slate-500" size={18} />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function ProjectConversation({ immersive = false, onBack, project }: { immersive?: boolean; onBack?: () => void; project: ProjectSummary }) {
  const rtc = useProjectRtc(project.projectId)
  const paid = isPaid(project.status)
  const general = isGeneralThread(project)
  const link = general
    ? { to: '/configurator', label: 'Nouveau projet' }
    : paid
      ? { to: `/client/project/${encodeURIComponent(project.projectId)}`, label: 'Ouvrir le suivi du projet' }
      : { to: `/configurator/preview?id=${encodeURIComponent(project.projectId)}`, label: 'Voir la maquette' }

  if (immersive) {
    // Téléphone : la conversation occupe tout l'écran (ClientShell immersive) ; seule la liste des messages défile.
    return (
      <>
        <ChatPanel
          className="min-h-0 flex-1"
          // Téléphone : le titre porte ce qui distingue la conversation (nom du projet ; « Équipe IsMoc » pour la
          // discussion générale) ; la ligne du dessous n'affiche que l'état En ligne / Hors ligne.
          counterpart={{ title: general ? 'Équipe IsMoc' : project.projectName, subtitle: general ? 'Ismael & Moctar' : 'Équipe IsMoc', online: rtc.isTeamOnline, avatars: ['IS', 'MO'] }}
          immersive
          inputId={DASHBOARD_CHAT_INPUT_ID}
          onBack={onBack}
          rtc={rtc}
        />
        <CallOverlay rtc={rtc} />
      </>
    )
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-slate-200/80 bg-white px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <ConnectionIndicator status={rtc.hubStatus} />
          <div className="min-w-0">
            {/* Référence seulement pour un vrai projet (la discussion générale disait deux fois « Avant-projet »). */}
            {!general && <p className="text-[12px] font-semibold text-[#B8530B]">Projet #{projectCode(project.projectId)}</p>}
            <p className="truncate text-sm font-bold">{general ? 'Discussion générale' : project.projectName} <span className="font-normal text-slate-500">· {general ? 'posez vos questions avant de démarrer' : projectStep(project.status).label}</span></p>
          </div>
        </div>
        <Link className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#0B132B] hover:underline" to={link.to}>
          {link.label} <ArrowRight size={14} />
        </Link>
      </div>
      {/* Hauteur calée sur l'écran (en-têtes de page + bandeau projet ≈ 385 px) : la barre de saisie reste visible sans défiler. */}
      <ChatPanel className="h-[clamp(300px,calc(100dvh-385px),760px)]" inputId={DASHBOARD_CHAT_INPUT_ID} rtc={rtc} />
      <CallOverlay rtc={rtc} />
    </div>
  )
}

export default MessagesTab
