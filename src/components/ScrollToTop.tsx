import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Changement de page : retour immédiat en haut (sans animation, qui donnait l'impression que la page « bouge »).
 * Un lien vers une ancre (#section) est laissé au navigateur. Le changement d'onglet de l'espace client
 * (?tab=…) est traité par la page elle-même.
 */
function ScrollToTop() {
  const { hash, pathname } = useLocation()

  useLayoutEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [hash, pathname])

  return null
}

export default ScrollToTop
