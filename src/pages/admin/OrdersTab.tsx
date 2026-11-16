import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, Hammer, LoaderCircle, MessagesSquare, Package, Rocket, Search, TrendingUp, Users, Wallet } from 'lucide-react'
import { STATUS_BADGES } from '../../components/admin/statusBadges'
import { downloadDevPack, publishProgress, type AdminOverview, type AdminProject, type ProgressResult } from '../../services/adminApi'
import { apiErrorMessage } from '../../services/apiError'
import { PROJECT_STEPS, formatDate, formatEuros, maintenanceLabel } from '../../services/projectTypes'

type OrderFilter = 'all' | 'to_develop' | 'awaiting' | 'delivered'

const FILTERS: Array<{ id: OrderFilter; label: string; match: (project: AdminProject) => boolean }> = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'to_develop', label: 'Payés (À développer)', match: (project) => project.status === 'in_development' },
  { id: 'awaiting', label: 'En attente de paiement', match: (project) => project.status === 'ordered' },
  { id: 'delivered', label: 'Livrés', match: (project) => project.status === 'delivered' || project.status === 'maintenance' },
]

interface OrdersTabProps {
  error: string
  overview: AdminOverview | null
  onMockup: (project: AdminProject) => void
  onOpenChat: (projectId: string) => void
  onProgressPublished: (projectId: string, result: ProgressResult) => void
}

function OrdersTab({ error, onMockup, onOpenChat, onProgressPublished, overview }: OrdersTabProps) {
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (error) return <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p>
  if (!overview) return <p className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Chargement du cockpit…</p>

  const { stats } = overview
  // Les fils « Discussion générale » ne sont pas des commandes : ils n'apparaissent que dans la messagerie.
  const projects = overview.projects.filter((project) => project.threadType !== 'general')
  const search = query.trim().toLocaleLowerCase('fr-FR')
  const activeFilter = FILTERS.find((item) => item.id === filter)!
  const visible = projects.filter((project) => activeFilter.match(project)
    && (!search || `${project.reference} ${project.title} ${project.client.fullName} ${project.client.email}`.toLocaleLowerCase('fr-FR').includes(search)))

  return (
    <>
      <dl className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Kpi accent icon={<TrendingUp size={18} />} label="CA encaissé" value={formatEuros(stats.totalRevenueEur)} />
        <Kpi icon={<Wallet size={18} />} label="Reste à encaisser" sub="échéances 2/3 et 3/3" value={formatEuros(stats.pendingInstallmentsEur)} />
        <Kpi icon={<Hammer size={18} />} label="Projets en codage" sub={`${stats.deliveredProjectsCount} livré${stats.deliveredProjectsCount > 1 ? 's' : ''}`} value={String(stats.activeProjectsCount)} />
        <Kpi icon={<Users size={18} />} label="Total clients" sub={`${stats.totalProjectsCount} projets`} value={String(stats.totalClientsCount)} />
      </dl>

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les commandes">
          {FILTERS.map((item) => {
            const count = projects.filter(item.match).length
            return (
              <button aria-selected={filter === item.id} className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${filter === item.id ? 'bg-[#F59E0B] text-[#0B132B]' : 'bg-white/[0.04] text-slate-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]'}`} key={item.id} onClick={() => setFilter(item.id)} role="tab" type="button">
                {item.label} <span className={filter === item.id ? 'text-[#0B132B]/60' : 'text-slate-500'}>{count}</span>
              </button>
            )
          })}
        </div>
        <label className="relative block lg:w-80">
          <span className="sr-only">Rechercher une commande</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#F59E0B]/60" onChange={(event) => setQuery(event.target.value)} placeholder="Référence, projet, client…" value={query} />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {visible.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center text-sm text-slate-500">Aucune commande dans cette vue.</p>}
        {visible.map((project) => (
          <OrderCard
            expanded={expandedId === project.projectId}
            key={project.projectId}
            onMockup={() => onMockup(project)}
            onOpenChat={() => onOpenChat(project.projectId)}
            onPublished={(result) => onProgressPublished(project.projectId, result)}
            onToggleProgress={() => setExpandedId((current) => (current === project.projectId ? null : project.projectId))}
            project={project}
          />
        ))}
      </div>
    </>
  )
}

interface OrderCardProps {
  expanded: boolean
  onMockup: () => void
  onOpenChat: () => void
  onPublished: (result: ProgressResult) => void
  onToggleProgress: () => void
  project: AdminProject
}

function OrderCard({ expanded, onMockup, onOpenChat, onPublished, onToggleProgress, project }: OrderCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const badge = STATUS_BADGES[project.status]
  const order = project.order
  const lastMilestone = project.recentMilestones[0]

  async function handleDownload() {
    setDownloadError('')
    setIsDownloading(true)
    try {
      await downloadDevPack(project)
    } catch (error: unknown) {
      setDownloadError(apiErrorMessage(error, 'Téléchargement du Pack Dev impossible.'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.015]">
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] xl:items-center">
        {/* Projet & client */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-[#F59E0B]">#{project.reference}</span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">{project.type}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badge.className}`}>{badge.label}</span>
          </div>
          <h3 className="mt-2 truncate text-[15px] font-bold text-white" title={project.title}>{project.title}</h3>
          <p className="mt-1 truncate text-[12px] text-slate-400">{project.client.fullName} · {project.client.email}{project.client.phoneNumber ? ` · ${project.client.phoneNumber}` : ''}</p>
        </div>

        {/* Montants */}
        <div className="text-[12px]">
          {order ? (
            <>
              <p className="text-xl font-bold tracking-tight text-white">{formatEuros(order.totalEur)}</p>
              <p className="mt-0.5 text-slate-400"><span className="text-emerald-300">{formatEuros(order.paidEur)} encaissé</span>{order.pendingEur > 0 && <> · {formatEuros(order.pendingEur)} à venir</>}</p>
              <p className="mt-0.5 truncate text-slate-500">{maintenanceLabel(order)}{order.cardLast4 ? ` · Carte •••• ${order.cardLast4}` : order.paymentDetail ? ` · ${order.paymentDetail}` : ''}</p>
            </>
          ) : (
            <p className="text-slate-500">Aucune commande · maquette en conception</p>
          )}
        </div>

        {/* Étape */}
        <div className="text-[12px]">
          <p className="font-semibold text-slate-200">Étape {project.step}/5 · <span className="text-slate-400">{project.stepLabel}</span></p>
          <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden>
            {PROJECT_STEPS.map((label, index) => (
              <span className={`h-1.5 rounded-full ${index + 1 < project.step ? 'bg-emerald-400' : index + 1 === project.step ? 'bg-[#F59E0B]' : 'bg-white/10'}`} key={label} />
            ))}
          </div>
          <p className="mt-2 truncate text-slate-500">{lastMilestone ? `${lastMilestone.title} · ${formatDate(lastMilestone.date, { day: 'numeric', month: 'short' })}` : `Créé le ${formatDate(project.createdAt, { day: 'numeric', month: 'short' })}`}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 xl:max-w-[340px] xl:justify-end">
          <ActionButton disabled={!project.hasDeliverable || isDownloading} icon={isDownloading ? <LoaderCircle className="animate-spin" size={14} /> : <Package size={14} />} label="Télécharger Pack Dev (.zip)" onClick={() => void handleDownload()} primary title={project.hasDeliverable ? undefined : 'Disponible après la commande'} />
          <ActionButton icon={<Eye size={14} />} label="Voir la maquette" onClick={onMockup} />
          <ActionButton active={expanded} icon={<Rocket size={14} />} label="Faire avancer" onClick={onToggleProgress} />
          <ActionButton icon={<MessagesSquare size={14} />} label={`Ouvrir le chat${project.messagesCount ? ` (${project.messagesCount})` : ''}`} onClick={onOpenChat} />
        </div>
      </div>
      {downloadError && <p className="border-t border-white/[0.06] px-6 py-2 text-xs text-red-300">{downloadError}</p>}
      {expanded && <ProgressPanel onPublished={onPublished} project={project} />}
    </article>
  )
}

function ProgressPanel({ onPublished, project }: { onPublished: (result: ProgressResult) => void; project: AdminProject }) {
  const isPaidProject = project.paymentStatus === 'paid'
  const [step, setStep] = useState<number>(project.step)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const stepChanged = isPaidProject && step !== project.step

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if ((!stepChanged && !title.trim()) || isSaving) return
    setIsSaving(true)
    setFeedback(null)
    try {
      const result = await publishProgress(project.projectId, { step: stepChanged ? step : null, title: title.trim(), description: description.trim() })
      onPublished(result)
      setTitle('')
      setDescription('')
      setFeedback({ ok: true, text: 'Avancée publiée : le client la voit en direct dans sa timeline.' })
    } catch (error: unknown) {
      setFeedback({ ok: false, text: apiErrorMessage(error, 'Publication impossible.') })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="grid gap-4 border-t border-white/[0.06] bg-black/20 p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Étape du projet</span>
        <select className="h-11 w-full rounded-xl border border-white/10 bg-[#0E1424] px-3 text-sm text-slate-100 outline-none focus:border-[#F59E0B]/60 disabled:opacity-50" disabled={!isPaidProject} onChange={(event) => setStep(Number(event.target.value))} value={step}>
          {PROJECT_STEPS.map((label, index) => {
            const value = index + 1
            // Étapes 1–2 : validées par le client (brief, paiement). L'équipe pilote 3 à 5.
            return <option disabled={value < 3 && value !== project.step} key={label} value={value}>{value}. {label}</option>
          })}
        </select>
        {!isPaidProject && <span className="mt-1 block text-[10px] text-slate-500">Étape pilotée par le client tant que le projet n’est pas payé.</span>}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Titre de l’avancée</span>
          <input className="h-11 w-full rounded-xl border border-white/10 bg-[#0E1424] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#F59E0B]/60" maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder={stepChanged ? 'Titre par défaut selon l’étape' : 'Ex. Parcours de commande finalisé'} value={title} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description (visible par le client)</span>
          <input className="h-11 w-full rounded-xl border border-white/10 bg-[#0E1424] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#F59E0B]/60" maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Ex. Les écrans panier et paiement sont prêts." value={description} />
        </label>
      </div>
      <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-5 text-[13px] font-bold text-[#0B132B] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50" disabled={(!stepChanged && !title.trim()) || isSaving} type="submit">
        {isSaving ? <LoaderCircle className="animate-spin" size={15} /> : <Rocket size={15} />} Publier l’avancée
      </button>
      {feedback && <p className={`text-xs lg:col-span-3 ${feedback.ok ? 'text-emerald-300' : 'text-red-300'}`} role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p>}
    </form>
  )
}

function Kpi({ accent = false, icon, label, sub, value }: { accent?: boolean; icon: ReactNode; label: string; sub?: string; value: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${accent ? 'border-[#F59E0B]/30 bg-gradient-to-br from-[#F59E0B]/15 to-transparent' : 'border-white/[0.07] bg-white/[0.025]'}`}>
      <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><span className={accent ? 'text-[#F59E0B]' : 'text-slate-500'}>{icon}</span>{label}</dt>
      <dd className="mt-3 text-[28px] font-bold leading-none tracking-tight text-white">{value}</dd>
      {sub && <p className="mt-2 text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

function ActionButton({ active = false, disabled, icon, label, onClick, primary = false, title }: { active?: boolean; disabled?: boolean; icon: ReactNode; label: string; onClick: () => void; primary?: boolean; title?: string }) {
  return (
    <button className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${primary ? 'bg-[#F59E0B] text-[#0B132B] hover:brightness-95' : active ? 'bg-white/15 text-white ring-1 ring-inset ring-white/20' : 'bg-white/[0.05] text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1]'}`} disabled={disabled} onClick={onClick} title={title} type="button">
      {icon}{label}
    </button>
  )
}

export default OrdersTab
