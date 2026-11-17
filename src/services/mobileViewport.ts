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
    })
  }
  updateHeight()
  visualViewport?.addEventListener('resize', updateHeight)
  window.addEventListener('resize', updateHeight)
  window.addEventListener('orientationchange', updateHeight)

  if (!window.matchMedia('(pointer: coarse)').matches) return

  document.addEventListener('focusin', (event) => {
    if (isTextField(event.target as Element)) root.dataset.keyboard = 'open'
  })
  document.addEventListener('focusout', () => {
    // Le focus peut passer directement d'un champ à un autre : on attend le nouvel élément actif.
    window.setTimeout(() => {
      if (!isTextField(document.activeElement)) delete root.dataset.keyboard
    }, 80)
  })
}
