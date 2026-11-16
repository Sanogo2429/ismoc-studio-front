import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { LoaderCircle, Pause, Play } from 'lucide-react'
import { api } from '../../services/api'

function formatSeconds(value: number): string {
  const seconds = Math.max(0, Math.floor(value))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Bulle lecteur de note vocale : Play/Pause, barre de progression cliquable et durée. */
function VoiceNotePlayer({ durationSeconds, mine, url }: { durationSeconds: number; mine: boolean; url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => () => {
    audioRef.current?.pause()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  // Les fichiers WebM n'exposent pas toujours leur durée : on s'appuie sur celle enregistrée.
  const total = durationSeconds > 0 ? durationSeconds : 1

  async function ensureAudio(): Promise<HTMLAudioElement | null> {
    if (audioRef.current) return audioRef.current
    setIsLoading(true)
    try {
      // Fichier protégé par JWT : chargé en blob via axios.
      const response = await api.get<Blob>(url, { responseType: 'blob' })
      objectUrlRef.current = URL.createObjectURL(response.data)
      const audio = new Audio(objectUrlRef.current)
      audio.ontimeupdate = () => setCurrent(audio.currentTime)
      audio.onended = () => { setIsPlaying(false); setCurrent(0) }
      audio.onpause = () => setIsPlaying(false)
      audio.onplay = () => setIsPlaying(true)
      audioRef.current = audio
      return audio
    } catch {
      setFailed(true)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  async function toggle() {
    const audio = await ensureAudio()
    if (!audio) return
    if (audio.paused) await audio.play().catch(() => setFailed(true))
    else audio.pause()
  }

  async function seek(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const audio = await ensureAudio()
    if (!audio) return
    audio.currentTime = ratio * total
    setCurrent(audio.currentTime)
  }

  const progress = Math.min(100, (current / total) * 100)

  return (
    <div className="flex w-[240px] items-center gap-3">
      <button aria-label={isPlaying ? 'Pause' : 'Écouter le message vocal'} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${mine ? 'bg-[#F59E0B] text-[#0B132B] hover:brightness-95' : 'bg-[#0B132B] text-white hover:opacity-90'}`} disabled={isLoading || failed} onClick={() => void toggle()} type="button">
        {isLoading ? <LoaderCircle className="animate-spin" size={15} /> : isPlaying ? <Pause size={15} /> : <Play className="translate-x-px" size={15} />}
      </button>
      <div className="min-w-0 flex-1">
        <button aria-label="Position de lecture" className={`relative block h-1.5 w-full overflow-hidden rounded-full ${mine ? 'bg-white/20' : 'bg-slate-200'}`} onClick={(event) => void seek(event)} type="button">
          <span className={`absolute inset-y-0 left-0 rounded-full ${mine ? 'bg-[#F59E0B]' : 'bg-[#0B132B]'}`} style={{ width: `${progress}%` }} />
        </button>
        <p className={`mt-1.5 text-[10px] tabular-nums ${mine ? 'text-white/60' : 'text-slate-500'}`}>
          {failed ? 'Lecture impossible' : `${formatSeconds(isPlaying || current > 0 ? current : 0)} / ${formatSeconds(total)}`}
        </p>
      </div>
    </div>
  )
}

export default VoiceNotePlayer
