import { useEffect, useState } from 'react'
import { LoaderCircle, Monitor, Smartphone, X } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { fetchMockupHtml } from '../../services/adminApi'
import { apiErrorMessage } from '../../services/apiError'

interface MockupModalProps {
  project: { projectId: string; reference: string; title: string; format: 'web' | 'mobile' }
  onClose: () => void
}

/** Maquette HTML validée du client, rendue en iframe isolée dans le cockpit. */
function MockupModal({ onClose, project }: MockupModalProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [device, setDevice] = useState<'desktop' | 'mobile'>(project.format === 'mobile' ? 'mobile' : 'desktop')
  useBodyScrollLock(true)

  useEffect(() => {
    let isActive = true
    fetchMockupHtml(project.projectId)
      .then((value) => { if (isActive) setHtml(value) })
      .catch((requestError: unknown) => { if (isActive) setError(apiErrorMessage(requestError, 'Impossible de charger la maquette.')) })
    return () => { isActive = false }
  }, [project.projectId])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div aria-label={`Maquette ${project.title}`} aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-[#05080F]/95 p-3 backdrop-blur-sm sm:p-6" role="dialog">
      <div className="mb-3 flex items-center justify-between gap-3 text-slate-100">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.25em] text-[#F59E0B]">#{project.reference} · MAQUETTE VALIDÉE</p>
          <p className="truncate text-base font-semibold">{project.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
            <button aria-pressed={device === 'desktop'} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${device === 'desktop' ? 'bg-white/15 text-white' : 'text-slate-400'}`} onClick={() => setDevice('desktop')} type="button"><Monitor size={14} /> Bureau</button>
            <button aria-pressed={device === 'mobile'} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${device === 'mobile' ? 'bg-white/15 text-white' : 'text-slate-400'}`} onClick={() => setDevice('mobile')} type="button"><Smartphone size={14} /> Mobile</button>
          </div>
          <button aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 ring-1 ring-white/10 hover:text-white" onClick={onClose} type="button"><X size={18} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-auto rounded-2xl bg-[#0E1424] p-3 ring-1 ring-white/10">
        {error ? (
          <p className="self-center rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        ) : html === null ? (
          <p className="flex items-center gap-2 self-center text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16} /> Chargement de la maquette…</p>
        ) : (
          <iframe className={`h-full rounded-xl border-0 bg-white transition-all ${device === 'mobile' ? 'w-[430px] max-w-full' : 'w-full'}`} sandbox="allow-scripts" srcDoc={html} title={`Maquette ${project.title}`} />
        )}
      </div>
    </div>
  )
}

export default MockupModal
