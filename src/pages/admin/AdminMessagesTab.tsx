import { useState } from 'react'
import { Eye, Inbox, LoaderCircle, Mail, Paperclip, Phone, Search } from 'lucide-react'
import CallOverlay from '../../components/CallOverlay'
import { ChatPanel } from '../../components/ProjectChat'
import { STATUS_BADGES } from '../../components/admin/statusBadges'
import { NARROW_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { useProjectRtc } from '../../hooks/useProjectRtc'
import type { AdminProject } from '../../services/adminApi'

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || 'C'
}

function relativeTime(value: string): string {
  const date = new Date(value)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface AdminMessagesTabProps {
  projects: AdminProject[] | null
  selectedProjectId: string | null
  unreadIds: ReadonlySet<string>
  onMockup: (project: AdminProject) => void
  onSelect: (projectId: string) => void
  /** Écran étroit : retour de la conversation vers la liste des dossiers. */
  onClose: () => void
}

/**
 * Messagerie pro split-screen : dossiers clients à gauche, conversation temps réel à droite.
 * Écran étroit : liste des dossiers → conversation (bouton retour), comme l'espace client.
 */
function AdminMessagesTab({ onClose, onMockup, onSelect, projects, selectedProjectId, unreadIds }: AdminMessagesTabProps) {
  const [query, setQuery] = useState('')
  const isNarrow = useMediaQuery(NARROW_QUERY)

  if (!projects) return <p className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Chargement des dossiers…</p>

  const search = query.trim().toLocaleLowerCase('fr-FR')
  const visible = projects.filter((project) => !search || `${project.reference} ${project.title} ${project.client.fullName}`.toLocaleLowerCase('fr-FR').includes(search))
  const selected = projects.find((project) => project.projectId === selectedProjectId) ?? null

  if (isNarrow && selected) {
    return <AdminConversation key={selected.projectId} onBack={onClose} onMockup={() => onMockup(selected)} project={selected} />
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:h-[calc(100dvh-190px)] lg:min-h-[640px] lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* ---------------- Dossiers ---------------- */}
      <aside className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] lg:min-h-[320px]">
        <div className="border-b border-white/[0.06] p-3">
          <label className="relative block">
            <span className="sr-only">Rechercher un dossier</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input className="h-10 w-full rounded-xl border border-white/10 bg-[#0E1424] pl-9 pr-3 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#F59E0B]/60" onChange={(event) => setQuery(event.target.value)} placeholder="Client, projet, référence…" value={query} />
          </label>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {visible.length === 0 && <li className="px-5 py-10 text-center text-xs text-slate-500">Aucun dossier.</li>}
          {visible.map((project) => {
            const isSelected = project.projectId === selectedProjectId
            const isUnread = unreadIds.has(project.projectId)
            const last = project.lastMessage
            const preview = last ? `${last.author === 'client' ? '' : 'Vous : '}${last.content || (last.hasAttachment ? 'Pièce jointe' : '')}` : 'Aucun message'
            return (
              <li key={project.projectId}>
                <button aria-current={isSelected ? 'true' : undefined} className={`flex w-full gap-3 border-b border-white/[0.04] px-4 py-3.5 text-left transition ${isSelected ? 'bg-[#F59E0B]/10' : 'hover:bg-white/[0.03]'}`} onClick={() => onSelect(project.projectId)} type="button">
                  <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isSelected ? 'bg-[#F59E0B] text-[#0B132B]' : 'bg-white/[0.08] text-slate-200'}`}>
                    {initials(project.client.fullName)}
                    {isUnread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#F59E0B] ring-2 ring-[#0A0F1C]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[13px] ${isUnread ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>{project.client.fullName}</span>
                      <span className="shrink-0 text-[12px] text-slate-500">{relativeTime(last?.sentAt ?? project.lastActivityAt)}</span>
                    </span>
                    <span className="block truncate text-[12px] text-slate-500"><span className="font-mono text-[#F59E0B]/80">#{project.reference}</span> · {project.title}</span>
                    <span className={`mt-0.5 flex items-center gap-1 truncate text-[12px] ${isUnread ? 'text-slate-200' : 'text-slate-500'}`}>{last?.hasAttachment && <Paperclip className="shrink-0" size={11} />}<span className="truncate">{preview}</span></span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* ---------------- Conversation (écran large uniquement) ---------------- */}
      {isNarrow ? null : selected ? (
        <AdminConversation key={selected.projectId} onMockup={() => onMockup(selected)} project={selected} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <Inbox className="text-slate-600" size={32} />
          <p className="mt-4 text-sm font-semibold text-slate-200">Sélectionnez un dossier client</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">Discutez en temps réel, échangez des fichiers et lancez des appels audio ou vidéo avec le client.</p>
        </div>
      )}
    </div>
  )
}

function AdminConversation({ onBack, onMockup, project }: { onBack?: () => void; onMockup: () => void; project: AdminProject }) {
  const rtc = useProjectRtc(project.projectId)
  const isGeneral = project.threadType === 'general'
  const badge = isGeneral ? { label: 'Avant-projet', className: 'bg-amber-500/15 text-amber-300 ring-amber-400/25' } : STATUS_BADGES[project.status]

  return (
    <section className="flex min-h-[560px] min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] font-bold text-[#F59E0B]">#{project.reference}</span>
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${badge.className}`}>{badge.label}</span>
            {!isGeneral && <span className="text-[12px] text-slate-500">Étape {project.step}/5</span>}
          </div>
          <p className="mt-1 truncate text-[13px] text-slate-300"><strong className="text-white">{project.client.fullName}</strong> · {project.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
          {project.client.email && <a className="flex min-h-[44px] min-w-0 items-center gap-1.5 break-all hover:text-slate-200" href={`mailto:${project.client.email}`}><Mail className="shrink-0" size={13} />{project.client.email}</a>}
          {project.client.phoneNumber && <a className="flex min-h-[44px] items-center gap-1.5 hover:text-slate-200" href={`tel:${project.client.phoneNumber}`}><Phone className="shrink-0" size={13} />{project.client.phoneNumber}</a>}
          {!isGeneral && <button className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-semibold text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1]" onClick={onMockup} type="button"><Eye size={13} /> Maquette</button>}
        </div>
      </div>
      <ChatPanel
        className="min-h-[520px] flex-1"
        counterpart={{ title: project.client.fullName, subtitle: `#${project.reference}`, online: rtc.isClientOnline, avatars: [initials(project.client.fullName)] }}
        inputId="admin-message"
        onBack={onBack}
        rtc={rtc}
        viewer="team"
      />
      <CallOverlay peerName={project.client.fullName} rtc={rtc} />
    </section>
  )
}

export default AdminMessagesTab
