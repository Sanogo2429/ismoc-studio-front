import { formatDate, formatEuros, projectCode, projectTypeLabel, type ProjectOrder } from './projectTypes'

const NAVY = '#0B132B'
const AMBER = '#F59E0B'
const HTML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export interface InvoiceProject {
  projectId: string
  projectName: string
  format: string
  order?: ProjectOrder | null
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character] ?? character)
}

/** Génère la facture HTML imprimable (Ctrl+P → PDF) en euros et la télécharge. */
export function downloadInvoice(project: InvoiceProject) {
  const order = project.order
  if (!order) return
  const clientName = localStorage.getItem('userName')?.trim() || 'Client'
  const planLabel = order.maintenancePlan === 'annual' ? 'Maintenance annuelle' : order.maintenancePlan === 'monthly' ? 'Maintenance mensuelle' : null
  const rows = [
    ['Développement sur mesure', formatEuros(order.developmentPriceEur)],
    ['Identité visuelle complète', formatEuros(order.designIdentityPriceEur)],
  ]
  const installments = order.installments.map((installment) => `<tr><td>${escapeHtml(installment.label)}</td><td>${installment.status === 'paid' ? `Réglée le ${formatDate(installment.paidAt)}` : 'À venir'}</td><td class="r">${formatEuros(installment.amountEur)}</td></tr>`).join('')
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${escapeHtml(order.invoiceNumber)}</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:780px;margin:40px auto;padding:0 24px}h1{font-size:28px;margin:0}.muted{color:#64748b;font-size:13px}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${AMBER};padding-bottom:20px}.brand{background:${NAVY};color:#fff;padding:10px 14px;border-radius:10px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}th{text-align:left;color:#64748b;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;padding:8px 0}td{padding:10px 0;border-bottom:1px solid #f1f5f9}.r{text-align:right}.total td{font-weight:700;font-size:18px;border-bottom:none}button{margin-top:28px;background:${AMBER};border:0;padding:12px 20px;border-radius:10px;font-weight:700;cursor:pointer}@media print{button{display:none}}</style></head>
<body><div class="head"><div><span class="brand">IsMoc STUDIO</span><h1 style="margin-top:18px">Facture</h1><p class="muted">N° ${escapeHtml(order.invoiceNumber)} · Projet #${projectCode(project.projectId)} · émise le ${formatDate(order.paidAt ?? order.orderedAt)}</p></div>
<div style="text-align:right"><p class="muted">Facturé à</p><strong>${escapeHtml(clientName)}</strong><p class="muted">Projet : ${escapeHtml(project.projectName)}<br>${projectTypeLabel(project.format)}</p></div></div>
<table><thead><tr><th>Prestation</th><th class="r">Montant HT</th></tr></thead><tbody>${rows.map(([label, value]) => `<tr><td>${label}</td><td class="r">${value}</td></tr>`).join('')}
<tr class="total"><td>Total projet</td><td class="r">${formatEuros(order.projectTotalEur)}</td></tr></tbody></table>
<table><thead><tr><th>Échéancier (paiement en 3 fois)</th><th>Statut</th><th class="r">Montant</th></tr></thead><tbody>${installments}</tbody></table>
${planLabel ? `<p class="muted" style="margin-top:20px">${planLabel} : ${formatEuros(order.maintenanceAmountEur)} / ${escapeHtml(order.maintenancePeriod ?? '')}, facturée à partir de la livraison.</p>` : ''}
<p class="muted">Moyen de paiement : ${escapeHtml(order.paymentDetail ?? '—')}. Montants exprimés en euros (€).</p>
<button onclick="window.print()">Imprimer / Enregistrer en PDF</button></body></html>`

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `facture-${order.invoiceNumber}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
