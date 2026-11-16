import { useState } from 'react'
import { ArrowRight, Globe, LoaderCircle, Plus, Smartphone } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PROJECT_STEPS,
  formatDate,
  formatEuros,
  isGeneralThread,
  isPaid,
  paymentStatusLabel,
  projectCode,
  projectStep,
  projectTypeLabel,
  type ProjectSummary,
} from '../../services/projectTypes'

const TONE_CLASSES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const PREVIEW_GRADIENTS = [
  'from-[#0B132B] via-[#1C2541] to-[#3A506B]',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-sky-500 via-indigo-500 to-violet-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
]

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || 'IM'
}

interface ProjectsTabProps {
  error: string
  projects: ProjectSummary[] | null
  userName: string
}

function ProjectsTab({ error, projects: allThreads, userName }: ProjectsTabProps) {
  // La « Discussion générale · Avant-projet » n'est pas un projet : elle n'apparaît que dans Messages.
  const projects = allThreads?.filter((project) => !isGeneralThread(project)) ?? null
  const navigate = useNavigate()
  const [today] = useState(() => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))
  const paidProjects = projects?.filter((project) => isPaid(project.status)) ?? []
  const committed = paidProjects.reduce((sum, project) => sum + (project.order?.projectTotalEur ?? 0), 0)

  function openProject(project: ProjectSummary) {
    if (isPaid(project.status)) navigate(`/client/project/${encodeURIComponent(project.projectId)}`)
    else if (project.status === 'ordered') navigate(`/configurator/checkout?id=${encodeURIComponent(project.projectId)}`)
    else navigate(`/configurator/preview?id=${encodeURIComponent(project.projectId)}`)
  }

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2.5 text-[12px] font-bold tracking-[0.25em] text-[#C2570C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />{today.toLocaleUpperCase('fr-FR')}</p>
          <h1 className="mt-4 text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">Bonjour, {userName}.</h1>
          <p className="mt-2 text-sm text-slate-500">Voici où en sont vos projets aujourd’hui.</p>
        </div>
        <Link className="inline-flex h-[50px] shrink-0 items-center gap-2 rounded-xl bg-[#F59E0B] px-6 text-[13px] font-bold text-[#0B132B] shadow-lg shadow-amber-500/25 transition hover:brightness-95" to="/configurator"><Plus size={18} /> Nouveau projet</Link>
      </div>

      {projects && projects.length > 0 && (
        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="Projets" value={String(projects.length)} />
          <Stat label="En développement ou livrés" value={String(paidProjects.length)} />
          <Stat label="Total engagé" value={formatEuros(committed)} />
        </dl>
      )}

      <div className="mt-10">
        {projects === null ? (
          <p className="flex items-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} /> Chargement de vos projets…</p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-bold">Aucun projet pour le moment</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Décrivez votre idée ou importez une maquette : IsMoc AI génère une première version interactive en quelques secondes.</p>
            <Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 text-sm font-semibold text-white" to="/configurator">Créer mon premier projet <ArrowRight size={16} /></Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {projects.map((project, index) => {
              const step = projectStep(project.status)
              const payment = paymentStatusLabel(project.status)
              const paid = isPaid(project.status)
              const FormatIcon = project.format === 'mobile' ? Smartphone : Globe
              return (
                <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5" key={project.projectId}>
                  <button className={`relative flex h-36 items-end justify-between bg-gradient-to-br p-5 text-left text-white ${PREVIEW_GRADIENTS[index % PREVIEW_GRADIENTS.length]}`} onClick={() => openProject(project)} type="button" aria-label={`Ouvrir ${project.projectName}`}>
                    <span className={`absolute left-5 top-5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${TONE_CLASSES[payment.tone]}`}>{payment.label}</span>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold backdrop-blur">{initials(project.projectName)}</span>
                    <span className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-[10px] font-medium backdrop-blur"><FormatIcon size={12} /> {project.format === 'mobile' ? 'Mobile' : 'Web'}</span>
                  </button>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-[10px] font-bold tracking-[0.25em] text-[#C2570C]">PROJET #{projectCode(project.projectId)}</p>
                    <h3 className="mt-2 truncate text-lg font-bold" title={project.projectName}>{project.projectName}</h3>
                    <p className="text-xs text-slate-500">{projectTypeLabel(project.format)} · créé le {formatDate(project.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold">Étape {step.index}/5</span>
                        <span className="text-slate-500">{step.label}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-1.5" aria-label={`Étape ${step.index} sur 5 : ${PROJECT_STEPS[step.index - 1]}`}>
                        {PROJECT_STEPS.map((label, stepIndex) => (
                          <span className={`h-1.5 rounded-full ${stepIndex < step.index - (paid ? 1 : 0) ? 'bg-emerald-500' : stepIndex === step.index - 1 ? 'bg-[#F59E0B]' : 'bg-slate-200'}`} key={label} title={label} />
                        ))}
                      </div>
                    </div>

                    {project.order && <p className="mt-4 text-xs text-slate-500">Total projet : <strong className="text-[#0B132B]">{formatEuros(project.order.projectTotalEur)}</strong></p>}

                    <div className="mt-auto flex gap-2 pt-6">
                      {paid ? (
                        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B132B] py-3 text-xs font-semibold text-white transition hover:opacity-90" onClick={() => openProject(project)} type="button">Suivre le projet <ArrowRight size={15} /></button>
                      ) : (
                        <>
                          <Link className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 py-3 text-xs font-semibold transition hover:border-slate-400" to={`/configurator/preview?id=${encodeURIComponent(project.projectId)}`}>Voir la maquette</Link>
                          <Link className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] py-3 text-xs font-bold text-[#0B132B] transition hover:brightness-95" to={`/configurator/checkout?id=${encodeURIComponent(project.projectId)}`}>{project.status === 'ordered' ? 'Finaliser le paiement' : 'Commander'}</Link>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-2 text-2xl font-bold tracking-tight">{value}</dd>
    </div>
  )
}

export default ProjectsTab
