import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Bell, CreditCard, Gauge, Home, LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { ClientNavId } from '../services/clientNavigation'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { isAdmin } from '../services/session'
import '../pages/Portal.css' // charge la police DM Sans de l'espace client
import { clearSessionCache } from '../services/sessionCache'

const NAVY = '#0B132B'
const AMBER = '#F59E0B'

const NAVIGATION: Array<{ id: ClientNavId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'projects', label: 'Mes projets', icon: LayoutDashboard },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'billing', label: 'Facturation', icon: CreditCard },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

/** Libellés courts de la barre inférieure mobile (mêmes rubriques que la barre latérale). */
const BOTTOM_NAVIGATION: Array<{ id: ClientNavId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'projects', label: 'Projets', icon: LayoutDashboard },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'billing', label: 'Facturation', icon: CreditCard },
  { id: 'settings', label: 'Profil', icon: Settings },
]

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || 'C'
}

interface ClientShellProps {
  active: ClientNavId
  children: ReactNode
  onNavigate: (id: ClientNavId) => void
  /** « Nous écrire » de l'encadré d'aide. */
  onHelp: () => void
  userName: string
  roleLabel?: string
  /** Indicateur affiché à gauche du profil (cloche ou état du temps réel). */
  statusSlot?: ReactNode
  /**
   * Téléphone : le contenu occupe exactement la zone visible (Messages) — seule la zone interne défile,
   * rien ne glisse quand le clavier s'ouvre.
   */
  fillViewport?: boolean
}

/** Barre latérale + barre supérieure communes à /dashboard et /client/project/:id. */
function ClientShell({ active, children, fillViewport = false, onHelp, onNavigate, roleLabel = 'Client', statusSlot, userName }: ClientShellProps) {
  const navigate = useNavigate()
  const [showCockpit] = useState(isAdmin)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  // Menu de profil ouvert : la page ne défile plus derrière ; Échap le ferme.
  useBodyScrollLock(isProfileMenuOpen)
  useEffect(() => {
    if (!isProfileMenuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsProfileMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [isProfileMenuOpen])

  function logout() {
    localStorage.removeItem('token')
    clearSessionCache()
    localStorage.removeItem('userName')
    navigate('/connexion')
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0B132B]" style={{ fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col overflow-y-auto px-5 pb-4 pt-6 text-white lg:flex" style={{ background: NAVY }}>
        <Link className="flex items-center gap-3.5 px-1" to="/" aria-label="IsMoc Studio, retour à l’accueil">
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-white text-lg font-extrabold tracking-tight text-[#0B132B]">I<span style={{ color: AMBER }}>/</span>M</span>
          <span className="leading-none"><strong className="block text-[22px] font-bold tracking-tight">IsMoc</strong><small className="mt-1.5 block text-[10px] font-semibold tracking-[0.35em] text-white/80">STUDIO</small></span>
        </Link>

        <p className="mt-8 px-3 text-[10px] font-semibold tracking-[0.25em] text-white/50">ESPACE CLIENT</p>
        <nav className="mt-3 space-y-1" aria-label="Navigation espace client">
          {NAVIGATION.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button aria-current={isActive ? 'page' : undefined} className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-[14px] transition ${isActive ? 'bg-white/[0.08] font-medium text-white' : 'text-white/70 hover:bg-white/[0.04] hover:text-white'}`} key={id} onClick={() => onNavigate(id)} type="button">
                <Icon size={19} style={isActive ? { color: AMBER } : undefined} />{label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <MessageSquare size={20} style={{ color: AMBER }} />
          <p className="mt-2.5 text-[14px] font-bold">Besoin d’aide ?</p>
          <p className="mt-1 text-[12px] leading-5 text-white/60">Notre équipe vous répond rapidement.</p>
          <button className="mt-2.5 inline-flex items-center gap-2 text-[12px] font-semibold" onClick={onHelp} style={{ color: AMBER }} type="button">Nous écrire <ArrowRight size={14} /></button>
        </div>
        <div className="mt-4 shrink-0 space-y-0.5 border-t border-white/10 pt-3">
          <Link className="flex items-center gap-2.5 px-1 py-1 text-[13px] text-white/60 transition hover:text-white" to="/">← Retour à l’accueil</Link>
          <button className="flex items-center gap-2.5 px-1 py-1 text-[13px] text-white/50 transition hover:text-white" onClick={logout} type="button"><LogOut size={16} /> Déconnexion</button>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="pt-safe sticky top-0 z-20 border-b border-slate-200/80 bg-white">
          <div className="flex h-16 items-center justify-between px-4 sm:px-12 md:h-[90px]">
            {/* Téléphone : logo seul, comme une application native */}
            <Link aria-label="IsMoc Studio, retour à l’accueil" className="flex min-h-[44px] items-center gap-2.5 md:hidden" to="/">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-extrabold tracking-tight text-white" style={{ background: NAVY }}>I<span style={{ color: AMBER }}>/</span>M</span>
              <strong className="text-[17px] font-bold tracking-tight">IsMoc</strong>
            </Link>
            <div className="hidden min-w-0 items-center gap-4 md:flex">
              <span className="text-[11px] font-semibold tracking-[0.3em] text-slate-400">ESPACE CLIENT</span>
              <Link className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[12px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-[#0B132B]" to="/">← Retour à l’accueil</Link>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              {showCockpit && <Link className="hidden items-center gap-2 rounded-xl bg-[#0B132B] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 md:inline-flex" to="/admin"><Gauge size={15} style={{ color: AMBER }} /> Cockpit Agence</Link>}
              {statusSlot ?? <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500"><Bell size={17} /></span>}
              <div className="hidden text-right leading-tight md:block">
                <p className="text-[13px] font-bold">{userName}</p>
                <p className="text-[10px] font-medium" style={{ color: AMBER }}>{roleLabel}</p>
              </div>
              <span className="hidden h-11 w-11 items-center justify-center rounded-full bg-[#FDF0D5] text-[13px] font-bold text-[#AF5109] md:flex">{initialsOf(userName)}</span>
              {/* Téléphone : l'avatar ouvre un petit menu (profil, cockpit, déconnexion) */}
              <div className="relative md:hidden">
                <button aria-expanded={isProfileMenuOpen} aria-haspopup="menu" aria-label="Menu du profil" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDF0D5] text-[13px] font-bold text-[#AF5109]" onClick={() => setIsProfileMenuOpen((open) => !open)} type="button">{initialsOf(userName)}</button>
                {isProfileMenuOpen && (
                  <>
                    <button aria-label="Fermer le menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setIsProfileMenuOpen(false)} tabIndex={-1} type="button" />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl" role="menu">
                      <div className="border-b border-slate-100 px-4 pb-2.5 pt-1.5 leading-tight">
                        <p className="truncate text-[13px] font-bold">{userName}</p>
                        <p className="text-[10px] font-medium" style={{ color: AMBER }}>{roleLabel}</p>
                      </div>
                      <button className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700" onClick={() => { setIsProfileMenuOpen(false); onNavigate('settings') }} role="menuitem" type="button"><Settings size={16} /> Mon profil</button>
                      {showCockpit && <Link className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700" onClick={() => setIsProfileMenuOpen(false)} role="menuitem" to="/admin"><Gauge size={16} style={{ color: AMBER }} /> Cockpit Agence</Link>}
                      <button className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-[13px] text-slate-600" onClick={logout} role="menuitem" type="button"><LogOut size={16} /> Déconnexion</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Navigation compacte (tablette) — sur téléphone, la barre inférieure prend le relais */}
          <nav className="hidden gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:flex lg:hidden" aria-label="Navigation espace client (tablette)">
            {NAVIGATION.map(({ id, label, icon: Icon }) => (
              <button className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${active === id ? 'bg-[#0B132B] text-white' : 'text-slate-600'}`} key={id} onClick={() => onNavigate(id)} type="button"><Icon size={14} />{label}</button>
            ))}
            <button className="ml-auto flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500" onClick={logout} type="button"><LogOut size={14} /> Déconnexion</button>
          </nav>
        </header>

        {/* Téléphone : marge basse pour que la barre inférieure ne masque pas la fin du contenu.
            fillViewport (Messages) : hauteur = zone visible, gérée par .client-main-fill (index.css). */}
        <main
          className={fillViewport
            ? 'client-main-fill px-4 sm:px-12 md:pb-14 md:pt-14'
            : 'px-5 pb-[calc(6rem+var(--safe-bottom))] pt-10 sm:px-12 sm:pt-14 md:pb-14'}
          data-fill-viewport={fillViewport || undefined}
        >
          {children}
        </main>
      </div>

      {/* Barre de navigation inférieure (téléphone uniquement), à portée de pouce */}
      <nav aria-label="Navigation espace client (mobile)" className="client-bottom-nav pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white md:hidden">
        <div className="flex h-16 items-stretch justify-around px-1">
          <Link className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-slate-500" to="/">
            <Home size={20} />Accueil
          </Link>
          {BOTTOM_NAVIGATION.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button aria-current={isActive ? 'page' : undefined} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] ${isActive ? 'font-semibold text-[#0B132B]' : 'font-medium text-slate-500'}`} key={id} onClick={() => onNavigate(id)} type="button">
                <Icon size={20} style={isActive ? { color: AMBER } : undefined} />{label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default ClientShell
