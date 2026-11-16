import { useEffect, useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { fetchAdminClients, type AdminClient } from '../../services/adminApi'
import { apiErrorMessage } from '../../services/apiError'
import { formatDate, formatEuros } from '../../services/projectTypes'

type SortKey = 'revenue' | 'registered' | 'projects' | 'name'

/** Tableau de tous les inscrits : coordonnées, ancienneté, projets et chiffre d'affaires en euros. */
function ClientsTab({ refreshKey }: { refreshKey: number }) {
  const [clients, setClients] = useState<AdminClient[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('revenue')

  useEffect(() => {
    let isActive = true
    fetchAdminClients()
      .then((data) => { if (isActive) { setClients(data); setError('') } })
      .catch((requestError: unknown) => { if (isActive) setError(apiErrorMessage(requestError, 'Impossible de charger les clients.')) })
    return () => { isActive = false }
  }, [refreshKey])

  if (error) return <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p>
  if (!clients) return <p className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Chargement des clients…</p>

  const search = query.trim().toLocaleLowerCase('fr-FR')
  const visible = clients
    .filter((client) => !search || `${client.fullName} ${client.email} ${client.phoneNumber}`.toLocaleLowerCase('fr-FR').includes(search))
    .sort((a, b) => {
      switch (sort) {
        case 'registered': return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
        case 'projects': return b.projectsCount - a.projectsCount
        case 'name': return a.fullName.localeCompare(b.fullName, 'fr')
        default: return b.revenueEur - a.revenueEur
      }
    })
  const totalRevenue = clients.reduce((sum, client) => sum + client.revenueEur, 0)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400"><strong className="text-white">{clients.length}</strong> inscrits · <strong className="text-white">{formatEuros(totalRevenue)}</strong> encaissés au total</p>
        <div className="flex gap-2">
          <select aria-label="Trier les clients" className="h-11 rounded-xl border border-white/10 bg-[#0E1424] px-3 text-[13px] text-slate-100 outline-none focus:border-[#F59E0B]/60" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
            <option value="revenue">Tri : total dépensé</option>
            <option value="registered">Tri : inscription récente</option>
            <option value="projects">Tri : nombre de projets</option>
            <option value="name">Tri : nom</option>
          </select>
          <label className="relative block sm:w-72">
            <span className="sr-only">Rechercher un client</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#F59E0B]/60" onChange={(event) => setQuery(event.target.value)} placeholder="Nom, e-mail, téléphone…" value={query} />
          </label>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10.5px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5 font-semibold">Nom</th>
              <th className="px-5 py-3.5 font-semibold">E-mail</th>
              <th className="px-5 py-3.5 font-semibold">Téléphone</th>
              <th className="px-5 py-3.5 font-semibold">Inscription</th>
              <th className="px-5 py-3.5 text-right font-semibold">Projets</th>
              <th className="px-5 py-3.5 text-right font-semibold">Total dépensé</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={6}>Aucun client ne correspond.</td></tr>}
            {visible.map((client) => (
              <tr className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.025]" key={client.clientId}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-bold text-slate-200">{client.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || '?'}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{client.fullName || '—'}</p>
                      {client.role === 'Admin' && <span className="text-[10px] font-semibold text-[#F59E0B]">Équipe IsMoc</span>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-300">{client.email}</td>
                <td className="px-5 py-3.5 text-slate-400">{client.phoneNumber || '—'}</td>
                <td className="px-5 py-3.5 text-slate-400">{formatDate(client.registeredAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-5 py-3.5 text-right text-slate-300">{client.projectsCount}{client.paidProjectsCount > 0 && <span className="ml-1 text-[11px] text-emerald-400">({client.paidProjectsCount} payé{client.paidProjectsCount > 1 ? 's' : ''})</span>}</td>
                <td className="px-5 py-3.5 text-right">
                  <p className="font-bold text-white">{formatEuros(client.revenueEur)}</p>
                  {client.committedEur > client.revenueEur && <p className="text-[10.5px] text-slate-500">sur {formatEuros(client.committedEur)} engagés</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ClientsTab
