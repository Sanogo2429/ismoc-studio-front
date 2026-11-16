import type { ProjectStatus } from '../../services/projectTypes'

/** Badges de statut du cockpit (thème sombre). */
export const STATUS_BADGES: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-slate-500/15 text-slate-300 ring-slate-400/20' },
  ordered: { label: 'Attente paiement', className: 'bg-orange-500/15 text-orange-300 ring-orange-400/25' },
  in_development: { label: 'Payé · À développer', className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25' },
  delivered: { label: 'Livré', className: 'bg-sky-500/15 text-sky-300 ring-sky-400/25' },
  maintenance: { label: 'Maintenance', className: 'bg-violet-500/15 text-violet-300 ring-violet-400/25' },
}
