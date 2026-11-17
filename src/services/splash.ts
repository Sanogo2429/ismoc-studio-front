/** Durée minimale d'affichage de l'écran de démarrage, comptée depuis sa première image (index.html). */
const MIN_VISIBLE_MS = 1500
const FADE_OUT_MS = 500

declare global {
  interface Window {
    /** Instant d'apparition de l'écran de démarrage (posé par le script de index.html). */
    __ismocSplashStart?: number
  }
}

/**
 * Efface l'écran de démarrage mobile (index.html) en fondu, une fois l'application affichée et au moins ~1,5 s
 * après son apparition. Sans écran de démarrage (ordinateur, déjà vu dans la session) : aucun effet.
 */
export function hideSplashScreen(): void {
  const splash = document.getElementById('splash')
  if (!splash) return
  const elapsed = Date.now() - (window.__ismocSplashStart ?? Date.now())
  window.setTimeout(() => {
    splash.classList.add('is-hidden')
    window.setTimeout(() => splash.remove(), FADE_OUT_MS)
  }, Math.max(0, MIN_VISIBLE_MS - elapsed))
}
