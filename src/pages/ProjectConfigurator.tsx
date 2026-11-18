import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileText,
  Globe,
  ImagePlus,
  LayoutGrid,
  LoaderCircle,
  MessageCircle,
  Palette,
  PenLine,
  Plus,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import GenerationProgress from '../components/GenerationProgress'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { fetchAiQuota, readAiError, type AiQuota } from '../services/aiQuota'
import { IMAGE_ACCEPT, prepareReferenceImage, type ReferenceImage } from '../services/imageUpload'

type CreationMode = 'ai' | 'manual'
type ProjectFormat = 'web' | 'mobile'

interface GenerationResponse {
  projectId: string
}

const SECTORS = [
  'Restauration & livraison',
  'E-commerce & boutique',
  'Santé & bien-être',
  'Éducation & formation',
  'Immobilier',
  'Transport & logistique',
  'Finance & SaaS B2B',
  'Tourisme & hôtellerie',
  'Sport & fitness',
  'Beauté & coiffure',
  'Événementiel',
  'Association & ONG',
]

const PALETTES = [
  { name: 'Ambre & nuit', primary: '#F59E0B', secondary: '#0F172A' },
  { name: 'Océan', primary: '#0EA5E9', secondary: '#0C4A6E' },
  { name: 'Émeraude', primary: '#10B981', secondary: '#064E3B' },
  { name: 'Corail', primary: '#F43F5E', secondary: '#1F2937' },
  { name: 'Violet', primary: '#8B5CF6', secondary: '#1E1B4B' },
  { name: 'Terracotta', primary: '#EA580C', secondary: '#431407' },
]

const MODULES: Record<ProjectFormat, string[]> = {
  web: ['Accueil', 'Catalogue / Produits', 'Fiche détail', 'Panier & commande', 'Réservation', 'Tableau de bord', 'Profil utilisateur', 'Connexion / Inscription', 'Blog / Actualités', 'Avis clients', 'FAQ', 'Contact'],
  mobile: ['Accueil', 'Recherche', 'Catalogue', 'Fiche détail', 'Panier', 'Réservation', 'Messagerie', 'Notifications', 'Carte / Localisation', 'Profil', 'Connexion', 'Paramètres'],
}

const MANUAL_STEPS = [
  { title: 'Format', icon: Globe },
  { title: 'Secteur', icon: Building2 },
  { title: 'Couleurs', icon: Palette },
  { title: 'Pages', icon: LayoutGrid },
  { title: 'Description', icon: FileText },
] as const

const MAX_MODULES = 12
/** Durée typique d'une génération complète (prototype multi-vues), pour la barre de progression. */
const GENERATION_ESTIMATE_SECONDS = 150
/** Identique à la validation backend (ProjectsController.MaxDescriptionLength). */
const MAX_DESCRIPTION_LENGTH = 8000
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function ProjectConfigurator() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<CreationMode>('ai')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  // Erreur du moteur IA (code AI_…) : un lien vers Messages accompagne le message générique.
  const [isAiError, setIsAiError] = useState(false)
  const [quota, setQuota] = useState<AiQuota | null>(null)

  useEffect(() => {
    let isActive = true
    fetchAiQuota().then((value) => { if (isActive) setQuota(value) }).catch(() => undefined)
    return () => { isActive = false }
  }, [])

  const aiExhausted = quota !== null && !quota.unlimited && quota.remainingGenerations <= 0

  // Mode IA
  const [idea, setIdea] = useState('')
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Mode Manuel
  const [step, setStep] = useState(0)
  const [format, setFormat] = useState<ProjectFormat>('web')
  const [sector, setSector] = useState('')
  const [customSector, setCustomSector] = useState('')
  const [primaryColor, setPrimaryColor] = useState(PALETTES[0].primary)
  const [secondaryColor, setSecondaryColor] = useState(PALETTES[0].secondary)
  const [modules, setModules] = useState<string[]>(['Accueil', 'Contact'])
  const [customModule, setCustomModule] = useState('')
  const [description, setDescription] = useState('')

  const effectiveSector = sector === '__custom' ? customSector.trim() : sector
  const stepIsValid = [
    true,
    effectiveSector.length > 0,
    HEX_COLOR.test(primaryColor) && HEX_COLOR.test(secondaryColor),
    modules.length > 0,
    true,
  ]
  const isLastStep = step === MANUAL_STEPS.length - 1

  async function generate(endpoint: string, payload: object) {
    setError('')
    setIsAiError(false)
    setIsLoading(true)
    try {
      const response = await api.post<GenerationResponse>(endpoint, payload)
      navigate(`/configurator/preview?id=${encodeURIComponent(response.data.projectId)}`)
    } catch (requestError: unknown) {
      const { code, quota: updatedQuota } = readAiError(requestError)
      if (updatedQuota) setQuota(updatedQuota)
      setIsAiError(code?.startsWith('AI_') ?? false)
      setError(apiErrorMessage(requestError, 'La création du projet a échoué. Vérifiez la connexion puis réessayez.'))
    } finally {
      setIsLoading(false)
    }
  }

  function handleAiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const initialIdea = idea.trim()
    if ((!initialIdea && !referenceImage) || isLoading) return
    void generate('/api/Projects/analyze-idea', { description: initialIdea, imageBase64: referenceImage?.dataUrl ?? null })
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

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    if (!isLastStep) {
      if (stepIsValid[step]) setStep(step + 1)
      return
    }
    void generate('/api/Projects/generate-manual', {
      format,
      sector: effectiveSector,
      primaryColor,
      secondaryColor,
      modules,
      description: description.trim(),
    })
  }

  function changeFormat(nextFormat: ProjectFormat) {
    setFormat(nextFormat)
    // Conserve les pages personnalisées et celles qui existent dans les deux formats.
    setModules((current) => {
      const kept = current.filter((module) => MODULES[nextFormat].includes(module) || !MODULES[format].includes(module))
      return kept.length ? kept : ['Accueil']
    })
  }

  function toggleModule(module: string) {
    setModules((current) => current.includes(module)
      ? current.filter((item) => item !== module)
      : current.length >= MAX_MODULES ? current : [...current, module])
  }

  function addCustomModule() {
    const value = customModule.trim().slice(0, 60)
    if (!value) return
    setModules((current) => current.some((item) => item.toLocaleLowerCase('fr-FR') === value.toLocaleLowerCase('fr-FR')) || current.length >= MAX_MODULES ? current : [...current, value])
    setCustomModule('')
  }

  function selectMode(nextMode: CreationMode) {
    setMode(nextMode)
    setError('')
  }

  const customModules = modules.filter((module) => !MODULES[format].includes(module))

  return (
    <main className="pb-safe min-h-screen bg-[#f6f7f9] text-darkSlate">
      {/* En-tête collant : pt-safe (env(safe-area-inset-top)) le garde sous la barre de statut de l'iPhone. */}
      <header className="pt-safe sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4">
          <Link className="inline-flex min-h-[44px] items-center gap-3" to="/dashboard" aria-label="IsMoc Studio, retour à mes projets">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-darkSlate text-sm font-bold text-white">I<span className="text-vibrantOrange">/</span>M</span>
            <span className="leading-tight"><strong className="block text-lg font-semibold">IsMoc</strong><small className="block text-[12px] font-semibold tracking-[0.3em] text-slate-500">AI STUDIO</small></span>
          </Link>
          <Link className="inline-flex min-h-[44px] items-center gap-2 text-xs font-medium text-slate-500 hover:text-darkSlate" to="/dashboard?tab=projects"><ArrowLeft size={15} /> Mes projets</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <p className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.22em] text-amber-700"><Sparkles size={14} /> STUDIO IA UNIVERSEL</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2rem,1.3rem+3vw,3rem)] font-semibold leading-tight tracking-tight text-darkSlate">Qu’aimeriez-vous construire ?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">Décrivez simplement votre idée : IsMoc AI conçoit directement votre maquette interactive et cliquable, que vous ferez évoluer par conversation. Aucun fichier de design n’est nécessaire.</p>

        {/* Les deux modes. La carte « Créer avec IsMoc AI » sélectionnée contient directement sa zone de texte. */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Mode de création">
          <ModeCard
            active={mode === 'ai'}
            badge="Recommandé"
            description="Décrivez librement n’importe quelle idée d’application ou de site : IsMoc AI s’occupe du reste."
            disabled={isLoading}
            icon={<Sparkles size={20} />}
            onSelect={() => selectMode('ai')}
            title="Créer avec IsMoc AI"
          >
            {mode === 'ai' && (
              <>
                {quota && (
                  aiExhausted ? (
                    <div className="mx-5 mb-4 flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Vos {quota.generationsLimit} générations IA gratuites ont été utilisées.</p>
                        <p className="mt-1 text-xs leading-5 text-amber-800">Continuez gratuitement et sans limite avec le Mode Manuel, ou décrivez votre idée directement à l’équipe dans le chat.</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button className="inline-flex items-center gap-1.5 rounded-lg bg-darkSlate px-4 py-2.5 text-xs font-semibold text-white" onClick={() => selectMode('manual')} type="button"><PenLine size={14} /> Passer en Mode Manuel</button>
                        <Link className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold text-amber-900" to="/dashboard?tab=messages"><MessageCircle size={14} /> Écrire à l’équipe</Link>
                      </div>
                    </div>
                  ) : (
                    <p className="mx-5 mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-slate-600 ring-1 ring-slate-200">
                      <Sparkles className="text-amber-600" size={13} />
                      {quota.unlimited ? 'Crédits IA illimités' : `Crédits IA : ${quota.remainingGenerations}/${quota.generationsLimit} générations · ${quota.remainingRefinements}/${quota.refinementsLimit} retouches restantes`}
                    </p>
                  )
                )}
                <form className="border-t border-slate-100" onSubmit={handleAiSubmit}>
                  <label className="sr-only" htmlFor="project-idea">Décrivez le projet que vous souhaitez créer</label>
                  <textarea
                    autoFocus
                    className="min-h-48 w-full resize-y border-0 bg-transparent px-5 py-5 text-sm leading-6 text-darkSlate outline-none placeholder:text-slate-400 focus:ring-0 sm:px-6"
                    disabled={isLoading}
                    id="project-idea"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    onChange={(event) => setIdea(event.target.value)}
                    placeholder="Ex. Un jeu d’échecs jouable avec les règles standard, un tableau de bord SaaS de suivi des ventes, une application de réservation de voitures…"
                    value={idea}
                  />
                  {referenceImage && (
                    <div className="mx-5 mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 pr-3 sm:mx-6">
                      <img alt="Image d’inspiration jointe" className="h-14 w-20 rounded-md object-cover" src={referenceImage.dataUrl} />
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-darkSlate">{referenceImage.name}</p><p className="text-[12px] text-slate-400">Image d’inspiration : IsMoc AI s’en inspire pour concevoir votre maquette interactive.</p></div>
                      <button aria-label="Retirer l’image" className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-darkSlate" onClick={() => setReferenceImage(null)} type="button"><X size={15} /></button>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-3">
                      <input accept={IMAGE_ACCEPT} className="hidden" onChange={(event) => void handleImage(event)} ref={imageInputRef} type="file" />
                      <button className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:border-slate-400 disabled:opacity-50" disabled={isLoading} onClick={() => imageInputRef.current?.click()} type="button"><ImagePlus size={14} /> Joindre une image d’inspiration (optionnel)</button>
                      <span className="hidden text-[12px] text-slate-400 sm:inline">{idea.length} / {MAX_DESCRIPTION_LENGTH}</span>
                    </div>
                    <SubmitButton disabled={(!idea.trim() && !referenceImage) || isLoading || aiExhausted} isLoading={isLoading} label="Créer le prototype" />
                  </div>
                  {isLoading && (
                    <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
                      <GenerationProgress estimatedSeconds={GENERATION_ESTIMATE_SECONDS} />
                    </div>
                  )}
                  {error && <ErrorBanner contact={isAiError} message={error} />}
                </form>
              </>
            )}
          </ModeCard>
          <ModeCard
            active={mode === 'manual'}
            badge="Guidé pas à pas"
            description="Choisissez le format, le secteur, la palette et les pages : la maquette respecte exactement vos choix."
            disabled={isLoading}
            fullWidth={mode === 'ai'}
            icon={<PenLine size={20} />}
            onSelect={() => selectMode('manual')}
            title="Modéliser mon projet moi-même"
          />
        </div>

        {mode === 'manual' && (
          <form className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5" onSubmit={handleManualSubmit}>
            {/* Téléphone : « Étape X/N » + barre de progression (la rangée d'étapes est réservée aux écrans larges). */}
            <div className="border-b border-slate-100 px-5 py-4 md:hidden">
              <p className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-darkSlate">Étape {step + 1}/{MANUAL_STEPS.length}</span>
                <span className="truncate text-slate-500">{MANUAL_STEPS[step].title}</span>
              </p>
              <div aria-label={`Étape ${step + 1} sur ${MANUAL_STEPS.length} : ${MANUAL_STEPS[step].title}`} aria-valuemax={MANUAL_STEPS.length} aria-valuemin={1} aria-valuenow={step + 1} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar">
                <div className="h-full rounded-full bg-vibrantOrange transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((step + 1) / MANUAL_STEPS.length) * 100}%` }} />
              </div>
            </div>
            <ol className="hidden gap-1 overflow-x-auto border-b border-slate-100 px-3 py-3 sm:px-5 md:flex">
              {MANUAL_STEPS.map((item, index) => {
                const Icon = item.icon
                const reachable = index <= step || stepIsValid.slice(0, index).every(Boolean)
                return (
                  <li key={item.title}>
                    <button
                      aria-current={index === step ? 'step' : undefined}
                      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${index === step ? 'bg-darkSlate text-white' : index < step ? 'text-darkSlate hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-50'} disabled:cursor-not-allowed`}
                      disabled={isLoading || !reachable}
                      onClick={() => setStep(index)}
                      type="button"
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[12px] ${index < step ? 'bg-emerald-500 text-white' : index === step ? 'bg-vibrantOrange text-darkSlate' : 'bg-slate-100'}`}>{index < step ? <Check size={11} /> : index + 1}</span>
                      <Icon className="hidden sm:block" size={14} /> {item.title}
                    </button>
                  </li>
                )
              })}
            </ol>

            <div className="min-h-72 px-5 py-6 sm:px-6">
              {step === 0 && (
                <StepSection subtitle="Votre projet sera-t-il un site web ou une application mobile ?" title="Choisissez le format">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionCard active={format === 'web'} icon={<Globe size={22} />} onSelect={() => changeFormat('web')} subtitle="Responsive, navigation horizontale, pensé pour ordinateur et mobile." title="Site / application web" />
                    <OptionCard active={format === 'mobile'} icon={<Smartphone size={22} />} onSelect={() => changeFormat('mobile')} subtitle="Prototype dans un cadre de téléphone avec barre d’onglets." title="Application mobile" />
                  </div>
                </StepSection>
              )}

              {step === 1 && (
                <StepSection subtitle="Les contenus, données d’exemple et visuels seront adaptés à ce secteur." title="Secteur d’activité">
                  <div className="flex flex-wrap gap-2">
                    {SECTORS.map((item) => <Chip active={sector === item} key={item} label={item} onClick={() => setSector(item)} />)}
                    <Chip active={sector === '__custom'} label="Autre…" onClick={() => setSector('__custom')} />
                  </div>
                  {sector === '__custom' && (
                    <input
                      autoFocus
                      aria-label="Votre secteur d’activité"
                      className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 sm:max-w-md"
                      maxLength={100}
                      onChange={(event) => setCustomSector(event.target.value)}
                      placeholder="Ex. Location de matériel agricole"
                      value={customSector}
                    />
                  )}
                </StepSection>
              )}

              {step === 2 && (
                <StepSection subtitle="Ces couleurs de marque seront utilisées pour les boutons, accents et en-têtes." title="Palette de couleurs">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {PALETTES.map((palette) => {
                      const active = palette.primary === primaryColor && palette.secondary === secondaryColor
                      return (
                        <button
                          aria-pressed={active}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left text-xs font-medium transition ${active ? 'border-darkSlate ring-2 ring-darkSlate/10' : 'border-slate-200 hover:border-slate-400'}`}
                          key={palette.name}
                          onClick={() => { setPrimaryColor(palette.primary); setSecondaryColor(palette.secondary) }}
                          type="button"
                        >
                          <span className="flex overflow-hidden rounded-md"><span className="h-8 w-6" style={{ background: palette.primary }} /><span className="h-8 w-6" style={{ background: palette.secondary }} /></span>
                          {palette.name}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <ColorField label="Couleur principale" onChange={setPrimaryColor} value={primaryColor} />
                    <ColorField label="Couleur secondaire" onChange={setSecondaryColor} value={secondaryColor} />
                  </div>
                </StepSection>
              )}

              {step === 3 && (
                <StepSection subtitle={`Chaque page sélectionnée deviendra un écran navigable (${modules.length} / ${MAX_MODULES}).`} title="Pages et modules à inclure">
                  <div className="flex flex-wrap gap-2">
                    {MODULES[format].map((module) => <Chip active={modules.includes(module)} key={module} label={module} onClick={() => toggleModule(module)} />)}
                    {customModules.map((module) => (
                      <span className="inline-flex items-center gap-1 rounded-full border border-darkSlate bg-darkSlate py-1.5 pl-3 pr-1.5 text-xs font-medium text-white" key={module}>
                        {module}
                        <button aria-label={`Retirer ${module}`} className="rounded-full p-0.5 hover:bg-white/20" onClick={() => toggleModule(module)} type="button"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex max-w-md gap-2">
                    <input
                      aria-label="Ajouter une page personnalisée"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                      maxLength={60}
                      onChange={(event) => setCustomModule(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomModule() } }}
                      placeholder="Ajouter une page (ex. Suivi de livraison)"
                      value={customModule}
                    />
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium hover:border-slate-400 disabled:opacity-50" disabled={!customModule.trim() || modules.length >= MAX_MODULES} onClick={addCustomModule} type="button"><Plus size={14} /> Ajouter</button>
                  </div>
                </StepSection>
              )}

              {step === 4 && (
                <StepSection subtitle="Ajoutez les précisions utiles : nom du projet, cible, fonctionnalités clés, ton…" title="Description du projet">
                  <textarea
                    autoFocus
                    aria-label="Description du projet"
                    className="min-h-32 w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    disabled={isLoading}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Ex. « Chez Awa », restaurant sénégalais à Lyon. Commande en ligne avec retrait ou livraison, menu du jour mis en avant…"
                    value={description}
                  />
                  <dl className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-xs sm:grid-cols-2">
                    <Summary label="Format" value={format === 'web' ? 'Site / application web' : 'Application mobile'} />
                    <Summary label="Secteur" value={effectiveSector || '—'} />
                    <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Couleurs</dt><dd className="mt-1 flex items-center gap-2"><span className="h-4 w-4 rounded" style={{ background: primaryColor }} /><span className="h-4 w-4 rounded" style={{ background: secondaryColor }} />{primaryColor} · {secondaryColor}</dd></div>
                    <Summary label="Pages" value={modules.join(', ')} />
                  </dl>
                </StepSection>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-500 hover:text-darkSlate disabled:invisible" disabled={step === 0 || isLoading} onClick={() => setStep(step - 1)} type="button"><ArrowLeft size={15} /> Précédent</button>
              {isLastStep
                ? <SubmitButton disabled={!stepIsValid.every(Boolean) || isLoading} isLoading={isLoading} label="Générer ma maquette" />
                : <button className="inline-flex items-center gap-2 rounded-lg bg-darkSlate px-5 py-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!stepIsValid[step]} type="submit">Suivant <ArrowRight size={16} /></button>}
            </div>
            {isLoading && (
              <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
                <GenerationProgress estimatedSeconds={GENERATION_ESTIMATE_SECONDS} />
              </div>
            )}
            {error && <ErrorBanner contact={isAiError} message={error} />}
          </form>
        )}
      </section>
    </main>
  )
}

interface ModeCardProps {
  active: boolean
  badge: string
  description: string
  disabled: boolean
  icon: ReactNode
  onSelect: () => void
  title: string
  /** Contenu affiché DANS la carte, sous son en-tête (ex. la zone de texte du mode IA quand il est choisi). */
  children?: ReactNode
  /** Carte sur toute la largeur de la grille (automatique quand elle a un contenu). */
  fullWidth?: boolean
}

/**
 * Carte de mode : l'en-tête est le bouton radio ; le contenu éventuel (formulaire) est rendu dans la même carte.
 * Avec un contenu, la carte occupe toute la largeur pour laisser de la place à la zone de texte.
 */
function ModeCard({ active, badge, children, description, disabled, fullWidth = false, icon, onSelect, title }: ModeCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-white transition ${children || fullWidth ? 'sm:col-span-2' : ''} ${active ? 'border-darkSlate shadow-lg shadow-slate-900/10 ring-2 ring-vibrantOrange/60' : 'border-slate-200 hover:border-slate-400'}`}>
      <button
        aria-checked={active}
        className="relative block w-full p-5 text-left disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onSelect}
        role="radio"
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-vibrantOrange text-darkSlate' : 'bg-slate-100 text-slate-600'}`}>{icon}</span>
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${active ? 'bg-darkSlate text-white' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>
        </div>
        <h2 className="mt-4 text-base font-semibold text-darkSlate">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
        {active && !children && <Check aria-hidden className="absolute bottom-4 right-4 text-emerald-500" size={18} />}
      </button>
      {children}
    </div>
  )
}

function OptionCard({ active, icon, onSelect, subtitle, title }: { active: boolean; icon: ReactNode; onSelect: () => void; subtitle: string; title: string }) {
  return (
    <button aria-pressed={active} className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${active ? 'border-darkSlate ring-2 ring-darkSlate/10' : 'border-slate-200 hover:border-slate-400'}`} onClick={onSelect} type="button">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-darkSlate text-white' : 'bg-slate-100 text-slate-600'}`}>{icon}</span>
      <span><strong className="block text-sm font-semibold">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{subtitle}</span></span>
    </button>
  )
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-darkSlate bg-darkSlate text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`} onClick={onClick} type="button">
      {active && <Check size={12} />}{label}
    </button>
  )
}

function ColorField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  const id = `color-${label.replace(/\s+/g, '-')}`
  return (
    <div>
      <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400" htmlFor={id}>{label}</label>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
        <input aria-label={`${label} (sélecteur)`} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" onChange={(event) => onChange(event.target.value.toUpperCase())} type="color" value={HEX_COLOR.test(value) ? value : '#000000'} />
        <input className={`min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none ${HEX_COLOR.test(value) ? '' : 'text-red-600'}`} id={id} maxLength={7} onChange={(event) => onChange(event.target.value.trim())} value={value} />
      </div>
    </div>
  )
}

function StepSection({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-darkSlate">{title}</h2>
      <p className="mb-5 mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
      {children}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-darkSlate">{value}</dd></div>
}

function SubmitButton({ disabled, isLoading, label }: { disabled: boolean; isLoading: boolean; label: string }) {
  return (
    <button className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-vibrantOrange px-5 py-3 text-xs font-semibold text-darkSlate transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} type="submit">
      {isLoading ? <><LoaderCircle className="animate-spin" size={15} /> Génération en cours…</> : <>{label} <ArrowRight size={16} /></>}
    </button>
  )
}

function ErrorBanner({ contact = false, message }: { contact?: boolean; message: string }) {
  return <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-xs text-red-700 sm:px-6" role="alert">{message}{contact && <> <Link className="ml-1 font-semibold underline underline-offset-2" to="/dashboard?tab=messages">Écrire à l’équipe</Link></>}</p>
}

export default ProjectConfigurator
