import { useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, FolderKanban, MessageSquare, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { SkeletonBlock } from '../../components/Skeleton'
import { projectPath, type ClientNavId } from '../../services/clientNavigation'
import { formatEuros, isGeneralThread, isPaid, projectStep, type ProjectSummary } from '../../services/projectTypes'
import { getFirstName } from '../../services/session'

interface HomeTabProps {
  error: string
  projects: ProjectSummary[] | null
  userName: string
  onNavigate: (tab: ClientNavId) => void
}

/** Accueil de l'espace client : salutation, chiffres clés, raccourcis et projets récents. */
function HomeTab({ error, onNavigate, projects: allThreads, userName }: HomeTabProps) {
  const navigate = useNavigate()
  const projects = allThreads?.filter((project) => !isGeneralThread(project)) ?? null
  const [today] = useState(() => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))
  const paidProjects = projects?.filter((project) => isPaid(project.status)) ?? []
  const committed = paidProjects.reduce((sum, project) => sum + (project.order?.projectTotalEur ?? 0), 0)
  const recent = [...(projects ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3)

  return (
    <>
      <PageHeader subtitle={`${today.charAt(0).toLocaleUpperCase('fr-FR')}${today.slice(1)} · voici où en sont vos projets.`} title={`Bonjour, ${getFirstName(userName) || userName}.`} />

      {projects && projects.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat label="Projets" value={String(projects.length)} />
          <Stat label="En développement ou livrés" value={String(paidProjects.length)} />
          <div className="col-span-2 sm:col-span-1"><Stat label="Total engagé" value={formatEuros(committed)} /></div>
        </dl>
      )}

      {/* Raccourcis */}
      {/* Téléphone : « Nouveau projet » sur toute la largeur, les deux autres raccourcis côte à côte. */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link className="col-span-2 flex min-h-[64px] items-center gap-3 sm:col-span-1 rounded-2xl bg-[#F59E0B] px-5 py-4 text-[14px] font-bold text-[#0B132B] shadow-lg shadow-amber-500/20 transition hover:brightness-95" to="/configurator">
          <Plus size={20} /> Nouveau projet <ArrowRight className="ml-auto" size={18} />
        </Link>
        <ShortcutButton icon={<FolderKanban size={19} />} label="Mes projets" onClick={() => onNavigate('projects')} />
        <ShortcutButton icon={<MessageSquare size={19} />} label="Écrire à l’équipe" onClick={() => onNavigate('messages')} />
      </div>

      {/* Projets récents */}
      <section aria-labelledby="recent-projects" className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold" id="recent-projects">Projets récents</h2>
          {projects && projects.length > 0 && (
            <button className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold text-[#0B132B]" onClick={() => onNavigate('projects')} type="button">Tout voir <ChevronRight size={16} /></button>
          )}
        </div>
        <div className="mt-3">
          {projects === null ? (
            <div aria-busy="true" className="space-y-3" role="status"><span className="sr-only">Chargement de vos projets…</span>{[0, 1].map((index) => <SkeletonBlock className="h-[72px] rounded-2xl" key={index} />)}</div>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
          ) : recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="text-sm text-slate-500">Aucun projet pour le moment. Décrivez votre idée : IsMoc AI génère une première maquette en quelques secondes.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((project) => (
                <li key={project.projectId}>
                  <button className="flex min-h-[72px] w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left transition hover:border-slate-300" onClick={() => navigate(projectPath(project))} type="button">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{project.projectName}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Étape {projectStep(project.status).index}/5 · {projectStep(project.status).label}</span>
                    </span>
                    <ChevronRight className="shrink-0 text-slate-500" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}

function ShortcutButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="flex min-h-[64px] items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left text-[13px] font-semibold leading-tight transition hover:border-slate-300 sm:gap-3 sm:px-5 sm:py-4 sm:text-[14px]" onClick={onClick} type="button">
      <span className="shrink-0 text-[#B8530B]">{icon}</span>{label}<ChevronRight className="ml-auto hidden shrink-0 text-slate-500 sm:block" size={18} />
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-full rounded-2xl border border-slate-200/80 bg-white px-5 py-4 sm:px-6 sm:py-5">
      <dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-2 text-2xl font-bold tracking-tight">{value}</dd>
    </div>
  )
}

export default HomeTab
