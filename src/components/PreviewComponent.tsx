import { FileWarning } from 'lucide-react'

export type PreviewDevice = 'desktop' | 'mobile'

interface PreviewComponentProps {
  currentHtml: string
  title: string
  /** « desktop » : pleine largeur ; « mobile » : écran de 390 px centré dans un cadre d'appareil. */
  device?: PreviewDevice
}

/** Même seuil que le backend (OpenAiMvpService.MinimumHtmlLength) : en dessous, la maquette est considérée incomplète. */
const MINIMUM_HTML_LENGTH = 3000

function isRenderableHtml(html: string): boolean {
  return html.trim().length >= MINIMUM_HTML_LENGTH && /<body[\s>]/i.test(html)
}

/**
 * Canvas : affiche le prototype HTML généré par IsMoc AI dans une iframe isolée.
 * - sandbox sans allow-same-origin : les scripts du prototype ne peuvent pas accéder à l'application ;
 * - allow-forms / allow-modals / allow-popups : formulaires, alert/confirm et liens externes du prototype fonctionnent ;
 * - état de secours si le HTML est vide ou incomplet : le canvas n'est jamais une page blanche.
 */
function PreviewComponent({ currentHtml, device = 'desktop', title }: PreviewComponentProps) {
  if (!isRenderableHtml(currentHtml)) {
    return (
      <div className="flex min-h-[750px] flex-col items-center justify-center gap-3 rounded-xl bg-white px-6 text-center" role="status">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"><FileWarning size={22} /></span>
        <p className="text-sm font-semibold text-darkSlate">Aucune maquette affichable pour le moment</p>
        <p className="max-w-sm text-xs leading-5 text-slate-500">
          {currentHtml.trim()
            ? 'La dernière maquette reçue est incomplète. Demandez à IsMoc AI de la régénérer dans le chat : votre projet et son historique sont conservés.'
            : 'La maquette de ce projet est vide. Décrivez ce que vous souhaitez dans le chat et IsMoc AI la concevra.'}
        </p>
      </div>
    )
  }

  const frame = (className: string) => (
    <iframe
      // Remonte l'iframe à chaque nouvelle version : état JavaScript du prototype réinitialisé proprement.
      key={`${device}-${currentHtml.length}`}
      title={`Maquette interactive : ${title}`}
      srcDoc={currentHtml}
      sandbox="allow-scripts allow-forms allow-modals allow-popups"
      className={className}
    />
  )

  if (device === 'mobile') {
    return (
      <div className="flex min-h-[750px] justify-center rounded-xl bg-gradient-to-b from-slate-100 to-slate-200/60 px-2 py-6">
        {/* Cadre d'appareil : 390 px d'écran utile (largeur d'un smartphone récent). */}
        <div className="relative h-[812px] w-[410px] max-w-full shrink-0 overflow-hidden rounded-[44px] border-[10px] border-slate-900 bg-white shadow-2xl shadow-slate-900/20">
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-28 -translate-x-1/2 rounded-full bg-slate-900" />
          {frame('h-full w-full border-0 bg-white')}
        </div>
      </div>
    )
  }

  return frame('w-full h-full min-h-[750px] border-0 rounded-xl bg-white')
}

export default PreviewComponent
