import type { ReactNode } from 'react'
import { ArrowRight, CircleCheck, CreditCard, Download, LoaderCircle, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { downloadInvoice } from '../../services/invoice'
import { formatDate, formatEuros, isPaid, maintenanceLabel, projectCode, type ProjectSummary } from '../../services/projectTypes'
import { TabHeading } from './MessagesTab'

function paymentMethodLabel(project: ProjectSummary): string {
  const order = project.order
  if (!order) return '—'
  if (order.paymentMethod === 'card') return order.cardLast4 ? `Carte •••• ${order.cardLast4}` : 'Carte bancaire'
  return order.paymentDetail ?? 'Mobile Money / Virement'
}

function BillingTab({ projects }: { projects: ProjectSummary[] | null }) {
  if (projects === null) {
    return <p className="flex items-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} /> Chargement de vos factures…</p>
  }

  const paid = projects.filter((project) => isPaid(project.status) && project.order)
  const awaiting = projects.filter((project) => project.status === 'ordered' && project.order)
  const committed = paid.reduce((sum, project) => sum + (project.order?.projectTotalEur ?? 0), 0)
  const settled = paid.reduce((sum, project) => sum + (project.order?.installments.filter((item) => item.status === 'paid').reduce((total, item) => total + item.amountEur, 0) ?? 0), 0)

  return (
    <>
      <TabHeading subtitle="Vos commandes, échéanciers et factures en euros." title="Facturation" />

      {paid.length > 0 && (
        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          <Tile label="Total engagé" value={formatEuros(committed)} />
          <Tile label="Déjà réglé" tone="green" value={formatEuros(settled)} />
          <Tile label="Reste à régler" tone="amber" value={formatEuros(Math.max(0, committed - settled))} />
        </dl>
      )}

      {awaiting.length > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <p className="text-sm font-semibold text-amber-900">Commande{awaiting.length > 1 ? 's' : ''} en attente de paiement</p>
          <ul className="mt-3 space-y-2">
            {awaiting.map((project) => (
              <li className="flex flex-wrap items-center justify-between gap-3 text-sm" key={project.projectId}>
                <span>#{projectCode(project.projectId)} · {project.projectName} · <strong>{formatEuros(project.order!.projectTotalEur)}</strong></span>
                <Link className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline" to={`/configurator/checkout?id=${encodeURIComponent(project.projectId)}`}>Finaliser le paiement <ArrowRight size={14} /></Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paid.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-bold">Aucune facture pour le moment</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Vos factures en euros apparaîtront ici dès la commande de votre premier projet.</p>
          <Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 text-sm font-semibold text-white" to="/dashboard?tab=projects">Voir mes projets <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {paid.map((project) => {
            const order = project.order!
            return (
              <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" key={project.projectId}>
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.25em] text-[#C2570C]">#{projectCode(project.projectId)} · FACTURE {order.invoiceNumber}</p>
                    <h2 className="mt-1.5 text-lg font-bold">{project.projectName}</h2>
                    <p className="text-xs text-slate-500">Commandé le {formatDate(order.paidAt ?? order.orderedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total projet</p>
                    <p className="text-2xl font-bold tracking-tight">{formatEuros(order.projectTotalEur)}</p>
                  </div>
                </header>

                <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[380px] text-sm">
                      <caption className="mb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paiement en 3 fois</caption>
                      <tbody>
                        {order.installments.map((installment) => (
                          <tr className="border-t border-slate-100" key={installment.label}>
                            <td className="py-3 font-medium">{installment.label}</td>
                            <td className="py-3">
                              {installment.status === 'paid'
                                ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"><CircleCheck size={12} /> Réglée le {formatDate(installment.paidAt, { day: 'numeric', month: 'short' })}</span>
                                : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">À venir</span>}
                            </td>
                            <td className="py-3 text-right font-semibold tabular-nums">{formatEuros(installment.amountEur)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <dl className="space-y-3 rounded-xl bg-slate-50 p-5 text-sm">
                    <Row label="Développement sur mesure" value={formatEuros(order.developmentPriceEur)} />
                    <Row label="Identité visuelle complète" value={formatEuros(order.designIdentityPriceEur)} />
                    <Row label="Maintenance" value={maintenanceLabel(order)} />
                    <Row icon={order.paymentMethod === 'card' ? <CreditCard size={14} /> : <Smartphone size={14} />} label="Moyen de paiement" value={paymentMethodLabel(project)} />
                  </dl>
                </div>

                <footer className="flex justify-end border-t border-slate-100 px-6 py-4">
                  <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-semibold transition hover:border-slate-500" onClick={() => downloadInvoice(project)} type="button">Télécharger la facture <Download size={16} /></button>
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

function Tile({ label, tone, value }: { label: string; tone?: 'green' | 'amber'; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-2 text-2xl font-bold tracking-tight ${tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-[#C2570C]' : ''}`}>{value}</dd>
    </div>
  )
}

function Row({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="flex items-center gap-1.5 text-right font-semibold">{icon}{value}</dd>
    </div>
  )
}

export default BillingTab
