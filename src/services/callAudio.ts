/**
 * Contexte Web Audio partagé des appels (tonalités synthétisées).
 *
 * Politiques de lecture des navigateurs mobiles (iOS Safari, Chrome Android) : un AudioContext reste
 * « suspended » tant qu'il n'a pas été créé ou repris pendant un geste de l'utilisateur. Or la tonalité
 * démarre après l'accès caméra / micro (asynchrone), donc hors du clic sur « Appel ». On « déverrouille »
 * donc le contexte au premier toucher / clic sur la page, puis on le réutilise pour tous les appels.
 */

type AudioContextConstructor = typeof AudioContext

let sharedContext: AudioContext | null = null
let unlockListenersInstalled = false

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown'] as const

function audioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  // Anciennes versions de Safari : constructeur préfixé.
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
}

/** Contexte audio partagé (créé à la demande), ou null si le navigateur ne gère pas Web Audio. */
export function getCallAudioContext(): AudioContext | null {
  if (sharedContext && sharedContext.state !== 'closed') return sharedContext
  const Constructor = audioContextConstructor()
  if (!Constructor) return null
  try {
    sharedContext = new Constructor()
  } catch {
    sharedContext = null
  }
  return sharedContext
}

/**
 * Reprend le contexte s'il n'est pas actif (sans erreur si le navigateur refuse encore).
 * « interrupted » : état propre à iOS quand le micro / la caméra s'active ou qu'un autre son prend la main.
 */
export function resumeCallAudio(context: AudioContext) {
  if (context.state !== 'running' && context.state !== 'closed') void context.resume().catch(() => undefined)
}

/**
 * À appeler de façon SYNCHRONE dans un gestionnaire de clic (ex. bouton « Appel ») : crée / reprend le
 * contexte et joue un échantillon silencieux pendant le geste, ce que les navigateurs mobiles exigent.
 */
export function unlockCallAudio() {
  unlockFromGesture()
}

function removeUnlockListeners() {
  for (const eventName of UNLOCK_EVENTS) window.removeEventListener(eventName, unlockFromGesture, true)
  unlockListenersInstalled = false
}

function unlockFromGesture() {
  const context = getCallAudioContext()
  if (!context) {
    removeUnlockListeners()
    return
  }

  // iOS : jouer un échantillon silencieux PENDANT le geste active réellement la sortie audio.
  try {
    const silence = context.createBufferSource()
    silence.buffer = context.createBuffer(1, 1, 22050)
    silence.connect(context.destination)
    silence.start(0)
  } catch {
    // Sans incidence : la reprise ci-dessous suffit sur la plupart des navigateurs.
  }

  if (context.state === 'running') {
    removeUnlockListeners()
    return
  }
  void context.resume()
    .then(() => { if (context.state === 'running') removeUnlockListeners() })
    .catch(() => undefined)
}

/** Prépare l'audio des appels : déverrouillage au prochain geste de l'utilisateur (une seule fois). */
export function primeCallAudio() {
  if (unlockListenersInstalled || typeof window === 'undefined') return
  if (sharedContext?.state === 'running') return
  unlockListenersInstalled = true
  for (const eventName of UNLOCK_EVENTS) window.addEventListener(eventName, unlockFromGesture, { capture: true, passive: true })
}
