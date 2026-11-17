import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Sur-titre (identique sur toutes les pages de l'espace client). */
  eyebrow?: string
  /** Boutons à droite du titre (écran large) / sous le titre (téléphone). */
  actions?: ReactNode
  /**
   * Messages : sur téléphone, pendant la saisie (clavier ouvert), le sur-titre et le sous-titre se replient et le
   * titre rétrécit pour laisser la place à la conversation (voir .page-header--collapsible dans index.css).
   */
  collapsible?: boolean
}

/** En-tête unique de toutes les pages de l'espace client : sur-titre « ESPACE CLIENT », titre, sous-titre. */
function PageHeader({ actions, collapsible = false, eyebrow = 'ESPACE CLIENT', subtitle, title }: PageHeaderProps) {
  return (
    <div className={`flex shrink-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between${collapsible ? ' page-header--collapsible' : ''}`}>
      <div className="min-w-0">
        <p className="page-header-extra text-[12px] font-bold tracking-[0.25em] text-[#B8530B]">{eyebrow}</p>
        <h1 className="page-header-title mt-3 break-words text-[32px] font-bold leading-tight tracking-tight sm:text-[38px]">{title}</h1>
        {subtitle && <p className="page-header-extra mt-2 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

export default PageHeader
