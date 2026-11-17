/**
 * Hauteur réellement visible et état du clavier virtuel, exposés au CSS :
 * - --app-height : hauteur de la zone visible (visualViewport). Sur iPhone, elle rétrécit quand le clavier
 *   s'ouvre, contrairement à 100vh / 100dvh : les écrans « plein écran » (Messages) gardent ainsi leur barre de
 *   saisie juste au-dessus du clavier, sans que la page entière ne glisse.
 * - <html data-keyboard="open"> : un champ de texte a le focus sur un écran tactile (clavier affiché). Sert à
 *   masquer la barre de navigation du bas pendant la saisie.
 */

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

function isTextField(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return !element.readOnly
  if (element instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(element.type) && !element.readOnly
  return element instanceof HTMLElement && element.isContentEditable
}

/**
 * Garde le champ actif visible au-dessus du clavier (Studio IA, formulaires) : s'il est caché ou collé au bord de la
 * zone visible, il est recentré (scrollIntoView block: 'center', qui respecte le scroll-margin des champs : en-tête
 * collant + barre de statut). Les écrans pleins (Messages) gèrent eux-mêmes leur barre de saisie.
 */
function keepFocusedFieldVisible(): void {
  const field = document.activeElement
  if (!(field instanceof HTMLElement) || !isTextField(field) || field.closest('[data-fill-viewport]')) return
  const viewport = window.visualViewport
  const visibleTop = viewport?.offsetTop ?? 0
  const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight)
  const rect = field.getBoundingClientRect()
  // Un champ plus haut que la zone visible (grande description) : seul son haut doit être visible.
  const fieldBottom = Math.min(rect.bottom, rect.top + (visibleBottom - visibleTop) * 0.6)
  const margin = 16
  if (rect.top < visibleTop + margin || fieldBottom > visibleBottom - margin) {
    field.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }
}

export function initMobileViewport(): void {
  const root = document.documentElement
  const visualViewport = window.visualViewport

  let frame = 0
  const updateHeight = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const height = visualViewport?.height ?? window.innerHeight
      root.style.setProperty('--app-height', `${Math.round(height)}px`)
      // Écran plein (Messages) + clavier ouvert : iOS a pu faire glisser la page ; on la ramène en haut pour que
      // l'en-tête, la conversation et la barre de saisie restent dans la zone visible.
      if (root.dataset.keyboard === 'open' && document.querySelector('[data-fill-viewport]')) window.scrollTo(0, 0)
      // Autres pages : le champ en cours de saisie reste visible au-dessus du clavier.
      else if (root.dataset.keyboard === 'open') keepFocusedFieldVisible()
    })
  }
  updateHeight()
  visualViewport?.addEventListener('resize', updateHeight)
  window.addEventListener('resize', updateHeight)
  window.addEventListener('orientationchange', updateHeight)

  if (!window.matchMedia('(pointer: coarse)').matches) return

  document.addEventListener('focusin', (event) => {
    if (!isTextField(event.target as Element)) return
    root.dataset.keyboard = 'open'
    // Après l'animation d'ouverture du clavier iOS (~300 ms) : vérification que le champ est bien visible.
    window.setTimeout(keepFocusedFieldVisible, 350)
  })
  document.addEventListener('focusout', () => {
    // Le focus peut passer directement d'un champ à un autre : on attend le nouvel élément actif.
    window.setTimeout(() => {
      if (!isTextField(document.activeElement)) delete root.dataset.keyboard
    }, 80)
  })
}
