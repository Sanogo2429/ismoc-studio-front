import { useEffect, useState } from 'react'
import { Check, Download, Video } from 'lucide-react'
import { ProjectPageSkeleton } from '../components/Skeleton'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CallOverlay from '../components/CallOverlay'
import ClientShell from '../components/ClientShell'
import PageHeader from '../components/PageHeader'
import type { ClientNavId } from '../services/clientNavigation'
import { ChatPanel, ConnectionIndicator } from '../components/ProjectChat'
import { MOBILE_CHAT_HEIGHT } from '../services/clientNavigation'
import { useProjectRtc, type ProjectRtc } from '../hooks/useProjectRtc'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { downloadInvoice } from '../services/invoice'
import {
  PROJECT_STEPS,
  formatDate,
  isPaid,
  projectCode,
  projectTypeLabel,
  type ProjectMilestone,
  type ProjectOrder,
  type ProjectQuote,
  type ProjectStatus,
} from '../services/projectTypes'

interface ClientProject {
  projectId: string
  projectName: string
  format: 'web' | 'mobile'
  status: ProjectStatus
  initialIdea: string
  quote: ProjectQuote | null
  order: ProjectOrder | null
  milestones: ProjectMilestone[]
  createdAt: string
}

const NAVY = '#0B132B'
const AMBER = '#F59E0B'
const CHAT_INPUT_ID = 'client-message'

function shortDate(value: string | null | undefined): string {
  return formatDate(value, { day: 'numeric', month: 'short' })
}

function focusChat() {
  const input = document.getElementById(CHAT_INPUT_ID)
  input?.focus()
  input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function ClientProjectDashboard() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const [loadedProject, setProject] = useState<ClientProject | null>(null)
  const [loadError, setLoadError] = useState('')
  const rtc = useProjectRtc(projectId)
  const userName = localStorage.getItem('userName')?.trim() || 'Client'
  // Étape et jalons publiés par l'équipe en temps réel (SignalR « ProjectUpdated »).
  const project = loadedProject && rtc.projectUpdate
    ? { ...loadedProject, status: rtc.projectUpdate.status, milestones: rtc.projectUpdate.milestones }
    : loadedProject

  useEffect(() => {
    let isActive = true
    api.get<ClientProject>(`/api/Projects/${encodeURIComponent(projectId)}/memory`)
      .then((response) => { if (isActive) setProject({ ...response.data, milestones: response.data.milestones ?? [] }) })
      .catch((error: unknown) => { if (isActive) setLoadError(apiErrorMessage(error, 'Impossible de charger ce projet.')) })
    return () => { isActive = false }
  }, [projectId])

  // Messages reste sur cette page (le chat du projet est ici) ; les autres rubriques ouvrent /dashboard sur le bon onglet.
  function handleNavigation(id: ClientNavId) {
    if (id === 'messages') focusChat()
    else navigate(id === 'home' ? '/dashboard' : `/dashboard?tab=${id}`)
  }

  return (
    <ClientShell active="projects" onHelp={focusChat} onNavigate={handleNavigation} statusSlot={<ConnectionIndicator status={rtc.hubStatus} />} userName={userName}>
      {loadError ? (
        <div className="mx-auto max-w-md py-24 text-center">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{loadError}</p>
          <Link className="mt-6 inline-block text-sm font-medium underline" to="/dashboard">Retour à mes projets</Link>
        </div>
      ) : !project ? (
        <ProjectPageSkeleton />
      ) : !isPaid(project.status) ? (
        <>
        <PageHeader subtitle={`Projet #${projectCode(project.projectId)} · en attente de commande`} title={project.projectName || 'Votre projet'} />
        <div className="mt-10 max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Ce projet n’a pas encore été commandé. Finalisez la commande pour lancer le développement et accéder au suivi en direct.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium" to={`/configurator/preview?id=${encodeURIComponent(project.projectId)}`}>Voir la maquette</Link>
            <Link className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0B132B]" style={{ background: AMBER }} to={`/configurator/checkout?id=${encodeURIComponent(project.projectId)}`}>Commander</Link>
          </div>
        </div>
        </>
      ) : (
        <ProjectWorkspace project={project} rtc={rtc} />
      )}
      <CallOverlay rtc={rtc} />
    </ClientShell>
  )
}

function ProjectWorkspace({ project, rtc }: { project: ClientProject; rtc: ProjectRtc }) {
  const milestoneDate = (keyword: string) => project.milestones.find((item) => item.title.toLocaleLowerCase('fr-FR').includes(keyword))?.date
  const deliveredDate = milestoneDate('livr')
  const statusIndex = { draft: 0, ordered: 0, in_development: 2, delivered: 3, maintenance: 4 }[project.status]
  const subtitles = [
    shortDate(milestoneDate('brief') ?? project.order?.orderedAt),
    shortDate(project.order?.paidAt),
    'En cours',
    deliveredDate ? shortDate(deliveredDate) : 'À venir',
    project.status === 'maintenance' ? 'En cours' : 'À venir',
  ]
  const steps = PROJECT_STEPS.map((label, index) => ({
    label,
    sub: subtitles[index],
    state: index < statusIndex || (index === 3 && project.status === 'delivered') ? 'done' : index === statusIndex ? 'active' : 'upcoming',
  }))

  const milestones = [...project.milestones].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const startedAt = project.order?.paidAt ?? project.createdAt

  return (
    <>
      <PageHeader
        actions={<>
          <button className="inline-flex h-[50px] items-center gap-3 rounded-xl border border-slate-300 bg-white px-7 text-[13px] font-semibold transition hover:border-slate-500 disabled:opacity-50" disabled={!project.order} onClick={() => downloadInvoice(project)} type="button">Facture <Download size={18} /></button>
          <button className="inline-flex h-[50px] items-center gap-3 rounded-xl px-7 text-[13px] font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:opacity-90 disabled:opacity-60" disabled={rtc.callStatus !== 'idle'} onClick={() => void rtc.startCall('video')} style={{ background: NAVY }} type="button">Appeler l’équipe <Video size={18} /></button>
        </>}
        subtitle={`Projet #${projectCode(project.projectId)} · ${projectTypeLabel(project.format)} · démarré le ${formatDate(startedAt, { day: '2-digit', month: 'long', year: 'numeric' })}`}
        title={project.projectName || 'Votre projet'}
      />

      <ol className="mt-10 grid grid-cols-5 rounded-2xl border border-slate-200/80 bg-white px-2 py-7 sm:px-10">
        {steps.map((step, index) => (
          <li className="relative flex flex-col items-center text-center" key={step.label}>
            {index > 0 && <span aria-hidden className="absolute right-1/2 top-4 h-px w-full bg-slate-200" />}
            <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${step.state === 'done' ? 'bg-[#22C55E] text-white' : step.state === 'active' ? 'bg-[#FBBF24] text-[#7C2D12] ring-4 ring-amber-100' : 'border border-slate-200 bg-white text-slate-500'}`}>
              {step.state === 'done' ? <Check size={15} strokeWidth={3} /> : index + 1}
            </span>
            <span className="mt-3 text-[10px] font-semibold leading-tight sm:text-[12px]">{step.label}</span>
            <span className={`mt-1.5 text-[9px] sm:text-[10px] ${step.state === 'active' ? 'font-medium text-[#D97706]' : 'text-slate-500'}`}>{step.sub}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <ChatPanel className={MOBILE_CHAT_HEIGHT + ' md:h-[640px]'} inputId={CHAT_INPUT_ID} rtc={rtc} />

        <section aria-labelledby="progress-heading" className="rounded-2xl border border-slate-200/80 bg-white px-7 py-8">
          <h2 className="text-[12px] font-bold tracking-[0.3em] text-[#B8530B]" id="progress-heading">DERNIÈRES AVANCÉES</h2>
          <ol className="mt-9">
            {milestones.map((milestone, index) => (
              <li className="grid grid-cols-[60px_24px_minmax(0,1fr)] gap-x-3" key={`${milestone.title}-${milestone.date}`}>
                <span className="pt-0.5 text-[10px] text-slate-500">{shortDate(milestone.date)}</span>
                <span className="relative flex justify-center">
                  <span className="relative z-10 mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: AMBER }}><span className="h-1 w-1 rounded-full" style={{ background: AMBER }} /></span>
                  {index < milestones.length - 1 && <span aria-hidden className="absolute bottom-0 top-4 w-px bg-slate-200" />}
                </span>
                <div className="pb-12">
                  <p className="mt-2.5 text-[13px] font-bold">{milestone.title}</p>
                  {milestone.description && <p className="mt-3 text-[12px] leading-5 text-slate-500">{milestone.description}</p>}
                </div>
              </li>
            ))}
            {milestones.length === 0 && <li className="text-sm text-slate-500">Les prochaines avancées apparaîtront ici.</li>}
          </ol>
        </section>
      </div>
    </>
  )
}

export default ClientProjectDashboard
