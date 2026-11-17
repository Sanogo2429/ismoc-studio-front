import { useEffect } from 'react'

/**
 * Bloque le défilement de la page derrière une modale, un menu burger ou un menu de profil ouvert.
 * iOS Safari ignore parfois overflow: hidden sur <body> : la page est figée en position: fixed à sa position
 * actuelle, puis remise exactement au même endroit à la fermeture (aucun saut). Compteur partagé : plusieurs
 * surcouches peuvent être ouvertes en même temps.
 */
let lockCount = 0
let savedScrollY = 0

function lock() {
  lockCount += 1
  if (lockCount > 1) return
  const { body, documentElement } = document
  savedScrollY = window.scrollY
  documentElement.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return
  const { body, documentElement } = document
  documentElement.style.overflow = ''
  body.style.position = ''
  body.style.top = ''
  body.style.left = ''
  body.style.right = ''
  body.style.width = ''
  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' })
}

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    lock()
    return unlock
  }, [active])
}
