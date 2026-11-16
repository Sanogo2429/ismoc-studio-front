import { useEffect } from 'react'
import { getCallAudioContext, primeCallAudio, resumeCallAudio } from '../services/callAudio'

/** Un bip de la séquence : fréquences jouées ensemble, ou « trille » alternant deux notes (sonnerie). */
interface ToneBurst {
  offset: number
  duration: number
  frequencies: number[]
  /** Alternance rapide entre les fréquences (Hz) : effet de sonnerie de téléphone modulée. */
  trillHz?: number
}

interface TonePattern {
  cycleSeconds: number
  volume: number
  bursts: ToneBurst[]
  /** Vibration synchronisée (Android ; ignorée là où l'API n'existe pas, comme sur iOS). */
  vibration?: number[]
}

/** Appel sortant : double bip discret (440 + 480 Hz) toutes les 3 secondes. */
const RINGBACK: TonePattern = {
  cycleSeconds: 3,
  volume: 0.12,
  bursts: [
    { offset: 0, duration: 0.4, frequencies: [440, 480] },
    { offset: 0.6, duration: 0.4, frequencies: [440, 480] },
  ],
}

/** Appel entrant : trois sonneries rapprochées en trille (do6 / mi6), répétées toutes les 2,4 secondes. */
const RINGTONE: TonePattern = {
  cycleSeconds: 2.4,
  volume: 0.16,
  bursts: [
    { offset: 0, duration: 0.28, frequencies: [1046.5, 1318.5], trillHz: 18 },
    { offset: 0.4, duration: 0.28, frequencies: [1046.5, 1318.5], trillHz: 18 },
    { offset: 0.8, duration: 0.28, frequencies: [1046.5, 1318.5], trillHz: 18 },
  ],
  vibration: [280, 120, 280, 120, 280],
}

/** Montée / descente de chaque bip : évite les « clics » audibles. */
const FADE_SECONDS = 0.02
/** Arrêt : coupure très courte (sans clic) dès que l'appel change d'état. */
const STOP_FADE_SECONDS = 0.03

function vibrate(pattern: number[] | number) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
  } catch {
    // Vibration refusée (pas de geste utilisateur, navigateur de bureau) : sans incidence.
  }
}

/**
 * Joue une tonalité d'appel en boucle tant que `active` est vrai et la coupe en ~30 ms dès qu'il repasse
 * à faux (décroché, refusé, raccroché, appel annulé par l'appelant) ou au démontage.
 */
function useCallTone(active: boolean, pattern: TonePattern) {
  // Contexte audio déverrouillé au premier geste sur la page (politiques iOS / Android).
  useEffect(() => { primeCallAudio() }, [])

  useEffect(() => {
    if (!active) return
    const maybeContext = getCallAudioContext()
    if (!maybeContext) return
    const context: AudioContext = maybeContext
    resumeCallAudio(context)

    const master = context.createGain()
    master.gain.value = pattern.volume
    master.connect(context.destination)

    const liveOscillators = new Set<OscillatorNode>()
    let nextCycleAt = context.currentTime + 0.05
    // Programmation en avance : le rythme reste régulier même si l'onglet ralentit les minuteries.
    const lookaheadSeconds = pattern.cycleSeconds * 1.5

    function scheduleBurst(burst: ToneBurst, cycleStart: number) {
      const start = cycleStart + burst.offset
      const end = start + burst.duration
      const envelope = context.createGain()
      envelope.gain.setValueAtTime(0, start)
      envelope.gain.linearRampToValueAtTime(1, start + FADE_SECONDS)
      envelope.gain.setValueAtTime(1, end - FADE_SECONDS)
      envelope.gain.linearRampToValueAtTime(0, end)
      envelope.connect(master)

      // Trille : un seul oscillateur dont la note alterne ; sinon toutes les fréquences ensemble.
      const voices = burst.trillHz ? [burst.frequencies[0]] : burst.frequencies
      for (const frequency of voices) {
        const oscillator = context.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, start)
        if (burst.trillHz) {
          const step = 1 / (2 * burst.trillHz)
          let index = 1
          for (let at = start + step; at < end; at += step, index += 1) {
            oscillator.frequency.setValueAtTime(burst.frequencies[index % burst.frequencies.length], at)
          }
        }
        oscillator.connect(envelope)
        oscillator.onended = () => {
          liveOscillators.delete(oscillator)
          oscillator.disconnect()
          envelope.disconnect()
        }
        oscillator.start(start)
        oscillator.stop(end + 0.01)
        liveOscillators.add(oscillator)
      }
    }

    function scheduleAhead() {
      // iOS suspend / interrompt le contexte à l'activation du micro et de la caméra : on le relance.
      resumeCallAudio(context)
      while (nextCycleAt < context.currentTime + lookaheadSeconds) {
        for (const burst of pattern.bursts) scheduleBurst(burst, nextCycleAt)
        nextCycleAt += pattern.cycleSeconds
      }
    }

    scheduleAhead()
    const audioTimer = window.setInterval(scheduleAhead, 500)

    let vibrationTimer: number | undefined
    if (pattern.vibration) {
      const vibration = pattern.vibration
      vibrate(vibration)
      vibrationTimer = window.setInterval(() => vibrate(vibration), pattern.cycleSeconds * 1000)
    }

    return () => {
      window.clearInterval(audioTimer)
      if (vibrationTimer !== undefined) {
        window.clearInterval(vibrationTimer)
        vibrate(0)
      }
      const now = context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + STOP_FADE_SECONDS)
      for (const oscillator of liveOscillators) {
        try {
          oscillator.stop(now + STOP_FADE_SECONDS + 0.01)
        } catch {
          // Déjà arrêté.
        }
      }
      window.setTimeout(() => master.disconnect(), 120)
    }
  }, [active, pattern])
}

/** Tonalité de retour d'appel (appelant) tant que l'appel attend une réponse. */
export function useRingbackTone(active: boolean) {
  useCallTone(active, RINGBACK)
}

/** Sonnerie d'appel entrant (appelé) tant que la notification d'appel est affichée. */
export function useIncomingRingtone(active: boolean) {
  useCallTone(active, RINGTONE)
}
