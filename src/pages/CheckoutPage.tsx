import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Building2, Check, CreditCard, LoaderCircle, Lock, ShieldCheck, Smartphone } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { formatEuros, isPaid, projectTypeLabel, type MaintenancePlanId } from '../services/projectTypes'
import BrandLogo from '../components/BrandLogo'

interface MaintenancePlan {
  id: MaintenancePlanId
  label: string
  amountEur: number
  period: string | null
  discountPercent: number
}

interface CheckoutSummary {
  projectId: string
  projectName: string
  format: 'web' | 'mobile'
  status: string
  complexityLevel: string | null
  estimatedDays: number | null
  developmentPriceEur: number
  designIdentityPriceEur: number
  projectTotalEur: number
  selectedPlan: MaintenancePlanId
  maintenancePlans: MaintenancePlan[]
  installments: Array<{ label: string; amountEur: number }>
}

type PaymentTab = 'card' | 'mobile_money'

const MOBILE_PROVIDERS = ['Orange Money', 'Wave', 'MTN Mobile Money', 'Moov Money', 'Virement bancaire']
const NAVY = '#0B132B'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Algorithme de Luhn : détecte les fautes de frappe sur le numéro de carte. */
function isValidCardNumber(value: string): boolean {
  const digits = digitsOnly(value)
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

function isValidExpiry(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

function planDescription(plan: MaintenancePlan): string {
  if (plan.id === 'none') return 'Aucune maintenance'
  if (plan.id === 'annual') return `${formatEuros(plan.amountEur)} / an · −${plan.discountPercent} %`
  return `${formatEuros(plan.amountEur)} / mois`
}

function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('id') ?? ''
  const navigate = useNavigate()

  const [summary, setSummary] = useState<CheckoutSummary | null>(null)
  const [loadError, setLoadError] = useState('')
  const [plan, setPlan] = useState<MaintenancePlanId>('monthly')
  const [tab, setTab] = useState<PaymentTab>('card')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [provider, setProvider] = useState(MOBILE_PROVIDERS[0])
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (!projectId) return
    let isActive = true
    api.post<CheckoutSummary>(`/api/Projects/${encodeURIComponent(projectId)}/finalize-order`, { maintenancePlan: 'monthly' })
      .then((response) => {
        if (!isActive) return
        if (isPaid(response.data.status)) {
          navigate(`/client/project/${encodeURIComponent(projectId)}`, { replace: true })
          return
        }
        setSummary(response.data)
        setPlan(response.data.selectedPlan ?? 'monthly')
      })
      .catch((error: unknown) => {
        if (isActive) setLoadError(apiErrorMessage(error, 'Impossible de préparer votre commande.'))
      })
    return () => { isActive = false }
  }, [projectId, navigate])

  const selectedPlan = summary?.maintenancePlans.find((item) => item.id === plan)
  const firstInstallment = summary?.installments[0]?.amountEur ?? 0
  const isMobileMoney = provider !== 'Virement bancaire'

  const cardErrors = {
    name: cardName.trim().length < 2 ? 'Indiquez le nom figurant sur la carte.' : '',
    number: !isValidCardNumber(cardNumber) ? 'Numéro de carte invalide.' : '',
    expiry: !isValidExpiry(expiry) ? 'Date d’expiration invalide (MM/AA).' : '',
    cvc: !/^\d{3,4}$/.test(cvc) ? 'CVC invalide.' : '',
  }
  const phoneError = isMobileMoney && !/^\+?\d{8,15}$/.test(phone.replace(/[\s.-]/g, '')) ? 'Numéro de téléphone invalide.' : ''
  const formIsValid = tab === 'card' ? Object.values(cardErrors).every((value) => !value) : !phoneError

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (!summary || !formIsValid || isPaying) return

    setPayError('')
    setIsPaying(true)
    try {
      // Simulation du traitement bancaire : seuls les 4 derniers chiffres quittent le navigateur.
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await api.post(`/api/Projects/${encodeURIComponent(summary.projectId)}/confirm-payment`, {
        maintenancePlan: plan,
        paymentMethod: tab,
        cardholderName: tab === 'card' ? cardName.trim() : null,
        cardLast4: tab === 'card' ? digitsOnly(cardNumber).slice(-4) : null,
        mobileProvider: tab === 'mobile_money' ? provider : null,
      })
      navigate(`/client/project/${encodeURIComponent(summary.projectId)}`)
    } catch (error: unknown) {
      setPayError(apiErrorMessage(error, 'Le paiement n’a pas pu être validé. Aucun montant n’a été débité.'))
      setIsPaying(false)
    }
  }

  const visibleLoadError = projectId ? loadError : 'Identifiant de projet manquant.'

  // Adresse sans projet : retour à la liste des projets plutôt qu'un écran d'erreur.
  if (!projectId) return <Navigate replace to="/dashboard?tab=projects" />

  return (
    <div className="pb-safe min-h-screen bg-white text-slate-900">
      <header className="pt-safe border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="inline-flex min-h-[44px] items-center gap-3" to="/dashboard" aria-label="IsMoc Studio, retour à mes projets">
            <BrandLogo />
          </Link>
          {projectId && <Link className="inline-flex min-h-[44px] items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900" to={`/configurator/preview?id=${encodeURIComponent(projectId)}`}><ArrowLeft size={15} /> Retour à la maquette</Link>}
        </div>
      </header>

      {visibleLoadError ? (
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{visibleLoadError}</p>
          <Link className="mt-6 inline-block text-sm font-medium text-slate-600 underline" to="/dashboard">Retour au tableau de bord</Link>
        </div>
      ) : !summary ? (
        <div className="flex min-h-[70svh] flex-col items-center justify-center gap-3 px-5 text-center">
          <LoaderCircle className="animate-spin text-[#F59E0B]" size={28} />
          <p className="text-sm font-medium">Calcul de votre devis en euros…</p>
          <p className="max-w-sm text-xs text-slate-500">IsMoc AI analyse les écrans et fonctionnalités de votre maquette. Cela peut prendre quelques secondes.</p>
        </div>
      ) : (
        <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14">
          {/* ---------------- Colonne gauche : paiement ---------------- */}
          <form noValidate onSubmit={handlePay}>
            <p className="text-[12px] font-bold tracking-[0.22em] text-[#AF5109]">DERNIÈRE ÉTAPE</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Finalisez votre projet.</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">Réglez le premier tiers aujourd’hui : nos développeurs démarrent immédiatement à partir de votre maquette validée.</p>

            <section className="mt-8" aria-labelledby="payment-heading">
              <h2 className="text-sm font-semibold" id="payment-heading">Moyen de paiement</h2>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
                <TabButton active={tab === 'card'} icon={<CreditCard size={15} />} label="Carte bancaire" onClick={() => setTab('card')} />
                <TabButton active={tab === 'mobile_money'} icon={<Smartphone size={15} />} label="Mobile Money / Virement" onClick={() => setTab('mobile_money')} />
              </div>

              {tab === 'card' ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field className="sm:col-span-2" error={submitted ? cardErrors.name : ''} label="Nom sur la carte">
                    <input autoComplete="cc-name" className={inputClass(submitted && cardErrors.name)} onChange={(event) => setCardName(event.target.value)} placeholder="Awa Diallo" value={cardName} />
                  </Field>
                  <Field className="sm:col-span-2" error={submitted ? cardErrors.number : ''} label="Numéro de carte">
                    <div className="relative">
                      <input autoComplete="cc-number" className={`${inputClass(submitted && cardErrors.number)} pr-10 font-mono tracking-wider`} inputMode="numeric" onChange={(event) => setCardNumber(digitsOnly(event.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '))} placeholder="1234 5678 9012 3456" value={cardNumber} />
                      <CreditCard className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    </div>
                  </Field>
                  <Field error={submitted ? cardErrors.expiry : ''} label="Expiration (MM/AA)">
                    <input autoComplete="cc-exp" className={`${inputClass(submitted && cardErrors.expiry)} font-mono`} inputMode="numeric" onChange={(event) => { const digits = digitsOnly(event.target.value).slice(0, 4); setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits) }} placeholder="08/28" value={expiry} />
                  </Field>
                  <Field error={submitted ? cardErrors.cvc : ''} label="CVC">
                    <input autoComplete="cc-csc" className={`${inputClass(submitted && cardErrors.cvc)} font-mono`} inputMode="numeric" onChange={(event) => setCvc(digitsOnly(event.target.value).slice(0, 4))} placeholder="123" type="password" value={cvc} />
                  </Field>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {MOBILE_PROVIDERS.map((item) => (
                      <button aria-pressed={provider === item} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${provider === item ? 'border-[#F59E0B] bg-amber-50 text-[#92400E]' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`} key={item} onClick={() => setProvider(item)} type="button">
                        {item === 'Virement bancaire' ? <Building2 size={13} /> : <Smartphone size={13} />}{item}
                      </button>
                    ))}
                  </div>
                  {isMobileMoney ? (
                    <Field error={submitted ? phoneError : ''} label={`Numéro ${provider}`}>
                      <input autoComplete="tel" className={inputClass(submitted && phoneError)} inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="+221 77 123 45 67" value={phone} />
                    </Field>
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Les coordonnées bancaires et la référence de virement vous seront communiquées dans votre espace client dès la validation. Le développement démarre à réception des fonds.</p>
                  )}
                </div>
              )}
            </section>

            <section className="mt-9" aria-labelledby="maintenance-heading">
              <h2 className="text-sm font-semibold" id="maintenance-heading">Maintenance &amp; assistance</h2>
              <p className="mt-1 text-xs text-slate-500">Hébergement, mises à jour de sécurité, correctifs et assistance — facturée à partir de la livraison.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup">
                {summary.maintenancePlans.map((item) => {
                  const active = item.id === plan
                  return (
                    <button aria-checked={active} className={`relative rounded-xl border p-4 text-left transition ${active ? 'border-[#F59E0B] bg-amber-50/60 ring-2 ring-[#F59E0B]/30' : 'border-slate-200 hover:border-slate-400'}`} key={item.id} onClick={() => setPlan(item.id)} role="radio" type="button">
                      {item.id === 'annual' && item.discountPercent > 0 && <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[12px] font-semibold text-white">−{item.discountPercent} %</span>}
                      <span className="flex items-center justify-between"><strong className="text-sm">{item.label}</strong>{active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] text-white"><Check size={12} /></span>}</span>
                      <span className="mt-2 block text-xs text-slate-500">{planDescription(item)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {payError && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">{payError}</p>}

            <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-4 text-sm font-bold text-[#0B132B] shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" disabled={isPaying} type="submit">
              {isPaying ? <><LoaderCircle className="animate-spin" size={17} /> Traitement sécurisé…</> : <>Payer {formatEuros(firstInstallment)} 🔒</>}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500"><Lock size={12} /> Paiement chiffré et sécurisé</p>
            <p className="mt-1 text-center text-[12px] text-slate-400">Environnement de démonstration : aucun prélèvement réel n’est effectué.</p>
          </form>

          {/* ---------------- Colonne droite : récapitulatif ---------------- */}
          <aside className="h-fit rounded-3xl p-7 text-white shadow-2xl shadow-slate-900/20 lg:sticky lg:top-8" style={{ background: NAVY }}>
            <p className="text-[12px] font-bold tracking-[0.22em] text-white/50">RÉCAPITULATIF</p>
            <div className="mt-5 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B] text-[#0B132B]">{summary.format === 'mobile' ? <Smartphone size={20} /> : <ShieldCheck size={20} />}</span>
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#FCD34D]">{projectTypeLabel(summary.format)}</span>
                <h2 className="mt-1.5 truncate text-lg font-semibold" title={summary.projectName}>{summary.projectName}</h2>
                {summary.estimatedDays && <p className="text-xs text-white/50">Complexité {summary.complexityLevel?.toLocaleLowerCase('fr-FR')} · livraison estimée sous {summary.estimatedDays} jours ouvrés</p>}
              </div>
            </div>

            <dl className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm">
              <SummaryLine label="Développement sur mesure" value={formatEuros(summary.developmentPriceEur)} />
              <SummaryLine label="Identité visuelle complète" value={formatEuros(summary.designIdentityPriceEur)} />
              <SummaryLine
                label="Maintenance mensuelle"
                muted
                value={!selectedPlan || selectedPlan.id === 'none' ? 'Non incluse' : `${formatEuros(selectedPlan.amountEur)} / ${selectedPlan.period}`}
              />
            </dl>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#FCD34D]">PAIEMENT DU PROJET EN 3 FOIS</p>
              <ol className="mt-4 space-y-3">
                {summary.installments.map((installment, index) => (
                  <li className="flex items-center justify-between text-sm" key={installment.label}>
                    <span className="flex items-center gap-2.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${index === 0 ? 'bg-[#F59E0B] text-[#0B132B]' : 'bg-white/10 text-white/60'}`}>{index + 1}</span>
                      <span className={index === 0 ? 'font-medium' : 'text-white/60'}>{installment.label}</span>
                    </span>
                    <strong className={index === 0 ? 'text-[#FCD34D]' : 'font-medium text-white/80'}>{formatEuros(installment.amountEur)}</strong>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-6">
              <span className="text-sm text-white/60">Total projet</span>
              <strong className="text-3xl font-bold tracking-tight">{formatEuros(summary.projectTotalEur)}</strong>
            </div>
            <p className="mt-2 text-right text-[12px] text-white/40">Montants HT en euros{selectedPlan && selectedPlan.id !== 'none' ? ' · maintenance facturée séparément après livraison' : ''}</p>
          </aside>
        </main>
      )}
    </div>
  )
}

function inputClass(hasError: string | false): string {
  return `w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-300 focus:ring-4 ${hasError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-[#F59E0B] focus:ring-amber-100'}`
}

function Field({ children, className = '', error, label }: { children: ReactNode; className?: string; error: string; label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
    </label>
  )
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button aria-selected={active} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} onClick={onClick} role="tab" type="button">
      {icon}{label}
    </button>
  )
}

function SummaryLine({ label, muted = false, value }: { label: string; muted?: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-white/60">{label}</dt>
      <dd className={muted ? 'text-white/70' : 'font-semibold'}>{value}</dd>
    </div>
  )
}

export default CheckoutPage
