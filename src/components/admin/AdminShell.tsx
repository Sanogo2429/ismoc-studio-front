import type { ReactNode } from 'react'
import { Briefcase, ExternalLink, LogOut, MessagesSquare, RefreshCw, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { HubStatus } from '../../hooks/useProjectRtc'
import { clearSessionCache } from '../../services/sessionCache'

export type AdminTab = 'orders' | 'messages' | 'clients'

const NAVIGATION: Array<{ id: AdminTab; label: string; icon: typeof Briefcase }> = [
  { id: 'orders', label: 'Commandes & Projets', icon: Briefcase },
  { id: 'messages', label: 'Messagerie & Appels', icon: MessagesSquare },
  { id: 'clients', label: 'Clients', icon: Users },
]

const LOBBY_STATUS: Record<HubStatus, { color: string; label: string }> = {
  connected: { color: 'bg-emerald-400', label: 'Temps réel actif' },
  connecting: { color: 'bg-amber-400', label: 'Connexion…' },
  reconnecting: { color: 'bg-amber-400', label: 'Reconnexion…' },
  disconnected: { color: 'bg-slate-500', label: 'Temps réel hors ligne' },
}

interface AdminShellProps {
  active: AdminTab
  children: ReactNode
  isRefreshing: boolean
  lobbyStatus: HubStatus
  onNavigate: (tab: AdminTab) => void
  onRefresh: () => void
  subtitle: string
  title: string
  unreadCount: number
  userName: string
}

/** Cockpit agence : layout sombre isolé de l'espace client. */
function AdminShell({ active, children, isRefreshing, lobbyStatus, onNavigate, onRefresh, subtitle, title, unreadCount, userName }: AdminShellProps) {
  const navigate = useNavigate()
  const lobby = LOBBY_STATUS[lobbyStatus]
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || 'AD'

  function logout() {
    localStorage.removeItem('token')
    clearSessionCache()
    localStorage.removeItem('userName')
    navigate('/connexion')
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 [color-scheme:dark]" style={{ fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-white/[0.06] bg-[#060A14] px-4 pb-5 pt-7 lg:flex">
        <Link className="flex items-center gap-3 px-2" to="/admin" aria-label="Cockpit agence IsMoc">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F59E0B] text-[15px] font-extrabold text-[#0B132B]">I<span className="text-white">/</span>M</span>
          <span className="leading-none"><strong className="block text-lg font-bold tracking-tight text-white">IsMoc</strong><small className="mt-1.5 block text-[12px] font-bold tracking-[0.3em] text-[#F59E0B]">COCKPIT AGENCE</small></span>
        </Link>

        <p className="mt-12 px-3 text-[12px] font-semibold tracking-[0.25em] text-slate-500">PILOTAGE</p>
        <nav className="mt-3 space-y-1" aria-label="Navigation du cockpit">
          {NAVIGATION.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button aria-current={isActive ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13.5px] font-medium transition ${isActive ? 'bg-[#F59E0B]/10 text-[#FCD34D] ring-1 ring-inset ring-[#F59E0B]/25' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'}`} key={id} onClick={() => onNavigate(id)} type="button">
                <Icon size={18} />
                <span className="flex-1 text-left">{label}</span>
                {id === 'messages' && unreadCount > 0 && <span className="rounded-full bg-[#F59E0B] px-2 py-0.5 text-[12px] font-bold text-[#0B132B]">{unreadCount}</span>}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-slate-200"><span className={`h-2 w-2 rounded-full ${lobby.color} ${lobbyStatus === 'connected' ? 'shadow-[0_0_10px] shadow-emerald-400/70' : ''}`} />{lobby.label}</p>
          <p className="mt-2 text-[12px] leading-5 text-slate-500">Tant que le cockpit est ouvert, l’équipe apparaît « En ligne » auprès des clients et reçoit leurs appels.</p>
        </div>
        <div className="mt-4 space-y-1 border-t border-white/[0.06] pt-4">
          <Link className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100" to="/dashboard"><ExternalLink size={15} /> Espace client</Link>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100" onClick={logout} type="button"><LogOut size={15} /> Déconnexion</button>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="pt-safe sticky top-0 z-20 border-b border-white/[0.06] bg-[#0A0F1C]/85 backdrop-blur-xl">
          <div className="flex min-h-[84px] items-center justify-between gap-4 px-5 sm:px-10">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
              <p className="truncate text-[12px] text-slate-500">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button aria-label="Actualiser les données" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white disabled:opacity-50" disabled={isRefreshing} onClick={onRefresh} title="Actualiser" type="button"><RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={16} /></button>
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[13px] font-semibold text-white">{userName}</p>
                <p className="text-[12px] font-semibold text-[#F59E0B]">Administrateur</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[12px] font-bold text-[#FCD34D] ring-1 ring-[#F59E0B]/30">{initials}</span>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-white/[0.06] px-3 py-2 lg:hidden" aria-label="Navigation du cockpit (mobile)">
            {NAVIGATION.map(({ id, label, icon: Icon }) => (
              <button className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${active === id ? 'bg-[#F59E0B]/15 text-[#FCD34D]' : 'text-slate-400'}`} key={id} onClick={() => onNavigate(id)} type="button"><Icon size={14} />{label}{id === 'messages' && unreadCount > 0 && ` (${unreadCount})`}</button>
            ))}
          </nav>
        </header>

        <main className="px-5 pb-[calc(2rem+var(--safe-bottom))] pt-8 sm:px-10 sm:pb-[calc(2.5rem+var(--safe-bottom))] sm:pt-10">{children}</main>
      </div>
    </div>
  )
}

export default AdminShell
