import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Calculator, ImagePlus, LoaderCircle, MessageCircle, Monitor, Send, ShoppingBag, Smartphone, Sparkles, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import GenerationProgress from '../components/GenerationProgress'
import PreviewComponent, { type PreviewDevice } from '../components/PreviewComponent'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { fetchAiQuota, readAiError, type AiQuota } from '../services/aiQuota'
import { IMAGE_ACCEPT, prepareReferenceImage, type ReferenceImage } from '../services/imageUpload'
import { formatEuros, isPaid } from '../services/projectTypes'

interface ProjectChatMessage {
  role: string
  content: string
}

interface ProjectMemory {
  projectId: string
  projectName?: string
  status?: string
  creationMode?: string
  initialIdea: string
  userPreferences: string[]
  currentHtml: string
  chatHistory: ProjectChatMessage[]
}

interface EstimateBreakdown {
  workstream: string
  minDays: number
  maxDays: number
  minPriceEur: number
  maxPriceEur: number
}

interface EstimateResponse {
  complexity: string
  deliveryTime: { minDays: number; maxDays: number; summary?: string }
  breakdown: EstimateBreakdown[]
  totalBudgetEur: { min: number; max: number }
  summary: string
}

interface RefineResponse {
  reply: string
  html: string | null
  extractedPreference: string | null
  estimate?: EstimateResponse
}

interface EstimateEndpointResponse {
  reply: string
  estimate: EstimateResponse
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  estimate?: EstimateResponse
}

const SUGGESTIONS = ['Rends le design plus moderne', 'Ajoute une page de contact', 'Combien coûterait ce projet ?']

function MvpPreviewPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('id') ?? ''
  const [memory, setMemory] = useState<ProjectMemory | null>(null)
  const [loadedProjectId, setLoadedProjectId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [instruction, setInstruction] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  // Type de travail en cours : la barre de progression n'apparaît au-dessus de l'aperçu que pour une retouche.
  const [workKind, setWorkKind] = useState<'refine' | 'estimate' | null>(null)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [error, setError] = useState('')
  // Erreur du moteur IA (code AI_…) : un lien vers Messages accompagne le message générique.
  const [isAiError, setIsAiError] = useState(false)
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null)
  const [quota, setQuota] = useState<AiQuota | null>(null)
  const refinementsExhausted = quota !== null && !quota.unlimited && quota.remainingRefinements <= 0

  useEffect(() => {
    let isActive = true
    fetchAiQuota().then((value) => { if (isActive) setQuota(value) }).catch(() => undefined)
    return () => { isActive = false }
  }, [])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const isLoadingMemory = Boolean(projectId) && loadedProjectId !== projectId

  // Recharge l'aperçu et tout l'historique (y compris après F5).
  useEffect(() => {
    let isActive = true
    if (!projectId) return () => { isActive = false }

    api.get<ProjectMemory>(`/api/Projects/${encodeURIComponent(projectId)}/memory`)
      .then((response) => {
        if (!isActive) return
        const loadedMemory = response.data
        setMemory({ ...loadedMemory, userPreferences: loadedMemory.userPreferences ?? [], chatHistory: loadedMemory.chatHistory ?? [] })
        setMessages((loadedMemory.chatHistory ?? []).map((message) => ({
          role: message.role.toLocaleLowerCase() === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })))
        setError('')
        setLoadedProjectId(projectId)
      })
      .catch((requestError: unknown) => {
        if (!isActive) return
        setMemory(null)
        setError(apiErrorMessage(requestError, 'Impossible de charger la mémoire de ce projet.'))
        setLoadedProjectId(projectId)
      })

    return () => { isActive = false }
  }, [projectId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isWorking])

  const visibleError = projectId ? error : 'Identifiant de projet manquant. Revenez au configurateur pour créer une maquette.'

  async function send(userMessage: string, kind: 'chat' | 'estimate', image: ReferenceImage | null = null) {
    if (!memory || isWorking) return

    setError('')
    setMessages((current) => [...current, { role: 'user', content: image ? `🖼️ ${image.name}\n${userMessage}` : userMessage }])
    setIsWorking(true)
    setWorkKind(kind === 'estimate' ? 'estimate' : 'refine')

    try {
      if (kind === 'estimate') {
        const response = await api.post<EstimateEndpointResponse>('/api/Projects/estimate', { projectId, message: userMessage })
        setMessages((current) => [...current, { role: 'assistant', content: response.data.reply, estimate: response.data.estimate }])
        return
      }

      const response = await api.post<RefineResponse>('/api/Projects/refine', { projectId, instruction: userMessage, imageBase64: image?.dataUrl ?? null })
      const { reply, html, extractedPreference, estimate } = response.data
      if (html) {
        setMemory((current) => current ? {
          ...current,
          currentHtml: html,
          userPreferences: extractedPreference && !current.userPreferences.includes(extractedPreference)
            ? [...current.userPreferences, extractedPreference]
            : current.userPreferences,
        } : current)
      }
      setMessages((current) => [...current, { role: 'assistant', content: reply, estimate }])
      if (html) void fetchAiQuota().then(setQuota).catch(() => undefined)
    } catch (requestError: unknown) {
      const { code, quota: updatedQuota } = readAiError(requestError)
      if (updatedQuota) setQuota(updatedQuota)
      setIsAiError(code?.startsWith('AI_') ?? false)
      setError(apiErrorMessage(requestError, 'La demande a échoué. Vérifiez la connexion puis réessayez.'))
      setMessages((current) => [...current, { role: 'assistant', content: 'Je n’ai pas pu traiter cette demande. Votre maquette actuelle est conservée.' }])
    } finally {
      setIsWorking(false)
      setWorkKind(null)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const userInstruction = instruction.trim() || (referenceImage ? 'Refais la maquette en t’inspirant fidèlement de cette image de référence.' : '')
    if (!userInstruction || !memory || isWorking) return
    const image = referenceImage
    setInstruction('')
    setReferenceImage(null)
    void send(userInstruction, 'chat', image)
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setError('')
      setReferenceImage(await prepareReferenceImage(file))
    } catch (imageError: unknown) {
      setError(imageError instanceof Error ? imageError.message : 'Image invalide.')
    }
  }

  return (
    <div className="pb-safe min-h-screen bg-[#f6f7f9] text-darkSlate">
      <header className="pt-safe border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link className="inline-flex min-h-[44px] items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-darkSlate" to="/dashboard?tab=projects"><ArrowLeft size={16} /> Mes projets</Link>
          <div className="hidden items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> IsMoc AI Studio</div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sélecteur d'aperçu responsive */}
            <div aria-label="Taille de l’aperçu" className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group">
              <button aria-pressed={device === 'desktop'} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition ${device === 'desktop' ? 'bg-white text-darkSlate shadow-sm' : 'text-slate-500 hover:text-darkSlate'}`} onClick={() => setDevice('desktop')} title="Aperçu ordinateur (100 %)" type="button"><Monitor size={14} /> Desktop</button>
              <button aria-pressed={device === 'mobile'} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition ${device === 'mobile' ? 'bg-white text-darkSlate shadow-sm' : 'text-slate-500 hover:text-darkSlate'}`} onClick={() => setDevice('mobile')} title="Aperçu smartphone (390 px)" type="button"><Smartphone size={14} /> Mobile</button>
            </div>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-vibrantOrange px-3 py-2 text-xs font-semibold text-darkSlate transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!memory || isWorking}
              onClick={() => void send('Estime le tarif et les délais de ce projet.', 'estimate')}
              type="button"
            >
              <Calculator size={14} /> Estimer le tarif
            </button>
            {memory && (isPaid(memory.status)
              ? <Link className="inline-flex items-center gap-1.5 rounded-lg bg-darkSlate px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700" to={`/client/project/${encodeURIComponent(projectId)}`}>Suivre mon projet <ArrowRight size={14} /></Link>
              : <Link aria-disabled={isWorking} className={`inline-flex items-center gap-1.5 rounded-lg bg-darkSlate px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 ${isWorking ? 'pointer-events-none opacity-50' : ''}`} to={`/configurator/checkout?id=${encodeURIComponent(projectId)}`}><ShoppingBag size={14} /> Commander ce projet</Link>)}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-5 lg:px-7">
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Sparkles size={18} /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-[0.2em] text-amber-700">{memory?.creationMode === 'manual' ? 'PROJET MODÉLISÉ' : 'STUDIO IA'}</p>
            <h1 className="truncate text-lg font-semibold text-darkSlate" title={memory?.initialIdea}>{memory?.initialIdea || (isLoadingMemory ? 'Chargement du projet…' : 'Projet indisponible')}</h1>
          </div>
        </div>

        <div className="grid min-h-[calc(100dvh-150px)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <section aria-label="Canvas de la maquette" className="relative min-w-0 rounded-xl border border-slate-200 bg-white p-2 sm:p-4">
            {/* Retouche IA en cours : bandeau de progression au-dessus de l'aperçu (la maquette actuelle reste visible). */}
            {workKind === 'refine' && memory && (
              <div className="mb-3">
                <GenerationProgress estimatedSeconds={120} title="IsMoc AI met à jour votre maquette" variant="banner" />
              </div>
            )}
            {isLoadingMemory
              ? <div className="flex min-h-[750px] items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Chargement de votre projet…</div>
              : memory
                ? <PreviewComponent currentHtml={memory.currentHtml} device={device} title={memory.initialIdea} />
                : <div className="flex min-h-[750px] items-center justify-center rounded-xl bg-white px-6 text-center"><p className="max-w-sm text-sm leading-6 text-slate-500">Cette mémoire de projet n’est pas accessible.</p></div>}

            {/* Filigrane discret tant que le projet n'est pas validé (brouillon ou paiement en attente).
                pointer-events-none + select-none : aucun clic ni sélection n'est intercepté, la maquette reste 100 % interactive. */}
            {memory && !isLoadingMemory && !isPaid(memory.status) && (
              <div className="pointer-events-none absolute bottom-4 right-4 z-10 select-none sm:bottom-6 sm:right-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium tracking-wide text-slate-500 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                  Maquette IsMoc Studio — Non validé
                </span>
              </div>
            )}
          </section>

          <aside className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4 lg:h-[calc(100dvh-120px)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-darkSlate text-white"><MessageCircle size={17} /></span>
              <div><h2 className="text-sm font-semibold text-darkSlate">IsMoc AI</h2><p className="text-[12px] text-slate-400">{quota && !quota.unlimited ? `${quota.remainingRefinements}/${quota.refinementsLimit} retouches IA gratuites restantes` : 'Votre projet, sa mémoire et ses décisions'}</p></div>
            </div>

            {memory && memory.userPreferences.length > 0 && (
              <details className="border-b border-slate-100 px-4 py-2 text-[12px] text-slate-500">
                <summary className="cursor-pointer select-none font-medium text-slate-600">Préférences mémorisées ({memory.userPreferences.length})</summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">{memory.userPreferences.map((preference) => <li key={preference}>{preference}</li>)}</ul>
              </details>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.map((message, index) => (
                <div className={`max-w-[97%] rounded-xl px-3.5 py-3 text-xs leading-5 ${message.role === 'assistant' ? 'bg-slate-100 text-slate-700' : 'ml-auto w-fit bg-darkSlate text-white'}`} key={`${message.role}-${index}`}>
                  {message.estimate ? <EstimateCard estimate={message.estimate} /> : <p className="whitespace-pre-line break-words">{message.content}</p>}
                </div>
              ))}
              {isWorking && <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="animate-spin" size={14} /> IsMoc AI travaille sur votre projet…</div>}
              <div ref={chatEndRef} />
            </div>

            {visibleError && <p className="mx-3 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-4 text-red-700" role="alert">{visibleError}{isAiError && visibleError === error && <> <Link className="ml-1 font-semibold underline underline-offset-2" to="/dashboard?tab=messages">Écrire à l’équipe</Link></>}</p>}

            {refinementsExhausted && (
              <div className="mx-3 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-4 text-amber-900" role="status">
                <p className="font-semibold">Retouches IA gratuites épuisées.</p>
                <p className="mt-0.5">Les questions sur le prix restent possibles. Pour faire évoluer la maquette, échangez avec l’équipe ou repartez du Mode Manuel (gratuit et illimité).</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link className="rounded-md bg-darkSlate px-2.5 py-1.5 font-semibold text-white" to="/dashboard?tab=messages">Échanger avec l’équipe</Link>
                  <Link className="rounded-md border border-amber-300 bg-white px-2.5 py-1.5 font-semibold" to="/configurator">Mode Manuel</Link>
                </div>
              </div>
            )}

            <form className="border-t border-slate-100 p-3" onSubmit={handleSubmit}>
              {memory && messages.length <= 2 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => <button className="rounded-full border border-slate-200 px-2.5 py-1 text-[12px] text-slate-600 hover:border-slate-400 disabled:opacity-50" disabled={isWorking} key={suggestion} onClick={() => void send(suggestion, 'chat')} type="button">{suggestion}</button>)}
                </div>
              )}
              <label className="sr-only" htmlFor="studio-chat-input">Votre idée ou instruction</label>
              <textarea
                className="min-h-24 w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-xs leading-5 outline-none placeholder:text-slate-400 focus:border-slate-400"
                disabled={!memory || isWorking}
                id="studio-chat-input"
                maxLength={2000}
                onChange={(event) => setInstruction(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }}
                placeholder="Demandez une retouche, posez une question ou demandez un devis…"
                value={instruction}
              />
              {referenceImage && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 pr-2">
                  <img alt="Image de référence" className="h-10 w-14 rounded object-cover" src={referenceImage.dataUrl} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600">{referenceImage.name}</span>
                  <button aria-label="Retirer l’image" className="rounded p-0.5 text-slate-400 hover:text-darkSlate" onClick={() => setReferenceImage(null)} type="button"><X size={13} /></button>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input accept={IMAGE_ACCEPT} className="hidden" onChange={(event) => void handleImage(event)} ref={imageInputRef} type="file" />
                  <button aria-label="Joindre une image d’inspiration (optionnel)" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-darkSlate disabled:opacity-50" disabled={!memory || isWorking} onClick={() => imageInputRef.current?.click()} title="Joindre une image d’inspiration (optionnel)" type="button"><ImagePlus size={15} /></button>
                  <span className="text-[12px] text-slate-400">Entrée pour envoyer · Maj+Entrée pour une ligne</span>
                </div>
                <button aria-label="Envoyer le message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vibrantOrange text-darkSlate transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={(!instruction.trim() && !referenceImage) || !memory || isWorking} type="submit"><Send size={15} /></button>
              </div>
            </form>
          </aside>
        </div>
      </main>

    </div>
  )
}

function EstimateCard({ estimate }: { estimate: EstimateResponse }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-darkSlate">
      <p className="text-[12px] font-bold uppercase tracking-wider text-amber-700">Devis indicatif</p>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Complexité · {estimate.complexity}</p>
          <p className="mt-1 text-base font-bold">{formatEuros(estimate.totalBudgetEur.min)} – {formatEuros(estimate.totalBudgetEur.max)}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Délai</p>
          <p className="mt-1 text-sm font-semibold">{estimate.deliveryTime.minDays}–{estimate.deliveryTime.maxDays} jours</p>
          {estimate.deliveryTime.summary && <p className="text-[12px] text-slate-400">{estimate.deliveryTime.summary}</p>}
        </div>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-2">
        {estimate.breakdown.map((row) => (
          <div className="flex justify-between gap-3 text-[12px]" key={row.workstream}>
            <span className="text-slate-500">{row.workstream} · {row.minDays}–{row.maxDays} j</span>
            <strong className="whitespace-nowrap">{formatEuros(row.minPriceEur)} – {formatEuros(row.maxPriceEur)}</strong>
          </div>
        ))}
      </div>
      <p className="border-t border-slate-100 pt-2 text-[12px] leading-4 text-slate-400">{estimate.summary}</p>
    </div>
  )
}

export default MvpPreviewPage
