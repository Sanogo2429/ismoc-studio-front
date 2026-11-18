import { useEffect, useState } from 'react'
import { Check, LoaderCircle, Sparkles } from 'lucide-react'

const STEPS = [
  'Analyse du cahier des charges et architecture des écrans…',
  'Conception du design system et de la mise en page…',
  'Développement des interactions, filtres et données métier…',
  'Finalisation et optimisation du code…',
]

/** Durée d'affichage de chaque étape. */
const STEP_SECONDS = 10

interface GenerationProgressProps {
  /** Durée estimée de la génération, pour la courbe de progression et le temps restant. */
  estimatedSeconds: number
  /** « panel » : carte détaillée (création) ; « banner » : bandeau compact au-dessus de l'aperçu (retouche). */
  variant?: 'panel' | 'banner'
  title?: string
}

function formatRemaining(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    return rest ? `≈ ${minutes} min ${String(rest).padStart(2, '0')} s restantes` : `≈ ${minutes} min restantes`
  }
  return `≈ ${seconds} s restantes`
}

/**
 * Progression animée d'une génération IA : courbe continue de 5 % à 94 % (jamais 100 % tant que la réponse
 * n'est pas arrivée), temps restant estimé et 4 étapes qui défilent toutes les 10 secondes.
 * Le composant démarre son chronomètre à l'affichage : le monter pendant la génération, le démonter ensuite.
 */
function GenerationProgress({ estimatedSeconds, title = 'IsMoc AI conçoit votre prototype', variant = 'panel' }: GenerationProgressProps) {
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250)
    return () => window.clearInterval(timer)
  }, [startedAt])

  // Approche asymptotique : rapide au début, ralentit ensuite, plafonne à 94 %.
  const progress = Math.min(94, 5 + 89 * (1 - Math.exp(-elapsed / (estimatedSeconds / 2.2))))
  const stepIndex = Math.min(STEPS.length - 1, Math.floor(elapsed / STEP_SECONDS))
  const remaining = Math.max(0, Math.round(estimatedSeconds - elapsed))
  const timeLabel = remaining > 0 ? formatRemaining(remaining) : 'Encore quelques instants…'
  const percent = Math.round(progress)

  const bar = (
    <div
      aria-label={title}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percent}
      aria-valuetext={`${percent} % — ${STEPS[stepIndex]}`}
      className="relative h-2 w-full overflow-hidden rounded-full bg-amber-100"
      role="progressbar"
    >
      <div className="relative h-full rounded-full bg-gradient-to-r from-amber-400 via-vibrantOrange to-orange-500 transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }}>
        <span className="absolute inset-0 animate-pulse rounded-full bg-white/30" />
      </div>
    </div>
  )

  if (variant === 'banner') {
    return (
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3 shadow-sm" role="status">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-2 font-semibold text-darkSlate">
            <LoaderCircle className="shrink-0 animate-spin text-amber-600" size={15} />
            <span className="truncate"><span className="text-amber-700">{stepIndex + 1}/4</span> {STEPS[stepIndex]}</span>
          </span>
          <span className="shrink-0 tabular-nums text-slate-500">{percent} % · {timeLabel}</span>
        </div>
        <div className="mt-2.5">{bar}</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-5" role="status">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-vibrantOrange text-darkSlate">
            <span className="absolute inset-0 animate-ping rounded-xl bg-vibrantOrange/30" />
            <Sparkles size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-darkSlate">{title}</p>
            <p className="text-[12px] text-slate-500">{timeLabel}</p>
          </div>
        </div>
        <span className="text-2xl font-bold tabular-nums tracking-tight text-darkSlate">{percent} %</span>
      </div>

      <div className="mt-4">{bar}</div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {STEPS.map((label, index) => {
          const state = index < stepIndex ? 'done' : index === stepIndex ? 'active' : 'upcoming'
          return (
            <li className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px] leading-4 transition ${state === 'active' ? 'bg-white font-semibold text-darkSlate shadow-sm ring-1 ring-amber-200' : state === 'done' ? 'text-slate-500' : 'text-slate-400'}`} key={label}>
              <span className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${state === 'done' ? 'bg-emerald-500 text-white' : state === 'active' ? 'bg-vibrantOrange text-darkSlate' : 'bg-slate-200 text-slate-500'}`}>
                {state === 'done' ? <Check size={10} strokeWidth={3} /> : index + 1}
              </span>
              <span>{index + 1}/4 {label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default GenerationProgress
