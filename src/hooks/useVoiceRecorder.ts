import { useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 180
const CANDIDATE_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm']

export interface VoiceRecording {
  /** Fichier prêt à l'envoi, type MIME normalisé sans « ;codecs=… » (audio/webm, audio/ogg ou audio/mp4). */
  file: File
  seconds: number
}

/** Type MIME de base + extension correspondant à l'enregistrement (Safari produit de l'audio/mp4). */
function normalizedAudioType(mimeType: string): { type: string; extension: string } {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  if (base.includes('mp4') || base.includes('aac') || base.includes('m4a')) return { type: 'audio/mp4', extension: 'm4a' }
  if (base.includes('ogg')) return { type: 'audio/ogg', extension: 'ogg' }
  return { type: 'audio/webm', extension: 'webm' }
}

/** Enregistrement micro via MediaRecorder (max 3 min), avec chronomètre. */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  function releaseMedia() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setIsRecording(false)
  }

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
  }, [])

  async function start(): Promise<boolean> {
    setError('')
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('L’enregistrement vocal n’est pas pris en charge par ce navigateur.')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const mimeType = CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
      recorder.start(250)
      streamRef.current = stream
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setElapsed(0)
      setIsRecording(true)
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000)
        setElapsed(seconds)
        if (seconds >= MAX_SECONDS && recorderRef.current?.state === 'recording') recorderRef.current.pause()
      }, 250)
      return true
    } catch (mediaError: unknown) {
      setError(mediaError instanceof DOMException && mediaError.name === 'NotAllowedError'
        ? 'Accès au micro refusé. Autorisez-le dans votre navigateur.'
        : 'Impossible d’accéder au micro.')
      releaseMedia()
      return false
    }
  }

  /**
   * Arrête l'enregistrement et attend l'événement `onstop` — le dernier `dataavailable` est émis juste avant —
   * pour assembler TOUS les morceaux non vides. Retourne null si l'audio est vide.
   */
  function finish(): Promise<VoiceRecording | null> {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)
    const seconds = Math.min(MAX_SECONDS, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const chunks = chunksRef.current.filter((chunk) => chunk.size > 0)
        chunksRef.current = []
        const { type, extension } = normalizedAudioType(recorder.mimeType || chunks[0]?.type || 'audio/webm')
        const blob = new Blob(chunks, { type })
        releaseMedia()
        resolve(blob.size > 0 ? { file: new File([blob], `vocal.${extension}`, { type }), seconds } : null)
      }
      // Une pause (durée maximale atteinte) doit être levée pour que stop() émette les dernières données.
      if (recorder.state === 'paused') recorder.resume()
      recorder.stop()
    })
  }

  function cancel() {
    const recorder = recorderRef.current
    if (recorder) {
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
    }
    chunksRef.current = []
    releaseMedia()
  }

  return { isRecording, elapsed, error, maxSeconds: MAX_SECONDS, start, finish, cancel, clearError: () => setError('') }
}
