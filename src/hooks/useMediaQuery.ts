import { useSyncExternalStore } from 'react'

/** Suit une media query CSS (ex. téléphone : '(max-width: 767px)') et se met à jour à la rotation / au redimensionnement. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Téléphone : même seuil que le préfixe md: de Tailwind (768 px). */
export const PHONE_QUERY = '(max-width: 767px)'

/** Écran étroit (téléphone et tablette) : en dessous du préfixe lg: de Tailwind (1024 px). */
export const NARROW_QUERY = '(max-width: 1023px)'
