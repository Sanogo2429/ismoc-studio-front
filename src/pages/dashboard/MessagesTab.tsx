import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import CallOverlay from '../../components/CallOverlay'
import { ChatPanel, ConnectionIndicator } from '../../components/ProjectChat'
import { useProjectRtc } from '../../hooks/useProjectRtc'
import { DASHBOARD_CHAT_INPUT_ID, defaultConversationProject } from '../../services/clientNavigation'
import { isGeneralThread, isPaid, projectCode, projectStep, type ProjectSummary } from '../../services/projectTypes'

interface MessagesTabProps {
  projects: ProjectSummary[] | null
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
}

function MessagesTab({ onSelectProject, projects, selectedProjectId }: MessagesTabProps) {
  if (projects === null) {
    return <p className="flex items-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} /> Chargement de vos conversations…</p>
  }

  if (projects.length === 0) {
    return (
      <>
        <TabHeading subtitle="Échangez en direct avec Ismael, Moctar et l’équipe de développement." title="Messages" />
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-bold">Pas encore de conversation</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">La messagerie et les appels audio/vidéo avec l’équipe IsMoc s’ouvrent dès votre premier projet.</p>
          <Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 text-sm font-semibold text-white" to="/configurator">Créer mon premier projet <ArrowRight size={16} /></Link>
        </div>
      </>
    )
  }

  const selected = projects.find((project) => project.projectId === selectedProjectId) ?? defaultConversationProject(projects)!

  return (
    // Téléphone : colonne pleine hauteur (ClientShell fillViewport) — l'en-tête reste fixe, seule la liste défile.
    <div className="flex min-h-0 flex-1 flex-col md:block">
      <div className="hide-while-typing flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-5">
        {/* Le grand titre est réservé aux écrans larges : sur téléphone, la place va à la conversation. */}
        <div className="hidden md:block"><TabHeading subtitle="Échangez en direct avec Ismael, Moctar et l’équipe de développement." title="Messages" /></div>
        <h1 className="sr-only md:hidden">Messages</h1>
        {projects.length > 1 && (
          <label className="block w-full sm:w-80">
            <span className="mb-1.5 hidden text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:block">Projet</span>
            <span className="sr-only md:hidden">Projet</span>
            <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100 md:h-12" onChange={(event) => onSelectProject(event.target.value)} value={selected.projectId}>
              {projects.map((project) => <option key={project.projectId} value={project.projectId}>{isGeneralThread(project) ? `💬 ${project.projectName}` : `#${projectCode(project.projectId)} · ${project.projectName}`}</option>)}
            </select>
          </label>
        )}
      </div>
      {/* key : nouvelle connexion SignalR (salle) à chaque changement de projet. */}
      <ProjectConversation key={selected.projectId} project={selected} />
    </div>
  )
}

function ProjectConversation({ project }: { project: ProjectSummary }) {
  const rtc = useProjectRtc(project.projectId)
  const paid = isPaid(project.status)
  const general = isGeneralThread(project)
  const link = general
    ? { to: '/configurator', label: 'Lancer mon projet' }
    : paid
      ? { to: `/client/project/${encodeURIComponent(project.projectId)}`, label: 'Ouvrir le suivi du projet' }
      : { to: `/configurator/preview?id=${encodeURIComponent(project.projectId)}`, label: 'Voir la maquette' }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col md:mt-8 md:block">
      <div className="hide-while-typing mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 md:mb-4 md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <ConnectionIndicator status={rtc.hubStatus} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.25em] text-[#C2570C]">{general ? 'AVANT-PROJET' : `PROJET #${projectCode(project.projectId)}`}</p>
            <p className="truncate text-sm font-bold">{project.projectName} <span className="font-normal text-slate-500">· {general ? 'posez vos questions avant de démarrer' : projectStep(project.status).label}</span></p>
          </div>
        </div>
        <Link className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#0B132B] hover:underline" to={link.to}>
          {link.label} <ArrowRight size={14} />
        </Link>
      </div>
      {/* Téléphone : la conversation prend toute la hauteur restante ; écran large : hauteur fixe. */}
      <ChatPanel className="min-h-0 flex-1 md:h-[620px] md:flex-none" inputId={DASHBOARD_CHAT_INPUT_ID} rtc={rtc} />
      <CallOverlay rtc={rtc} />
    </div>
  )
}

export function TabHeading({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div>
      <p className="text-[12px] font-bold tracking-[0.25em] text-[#C2570C]">ESPACE CLIENT</p>
      <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-tight sm:text-[38px]">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

export default MessagesTab
