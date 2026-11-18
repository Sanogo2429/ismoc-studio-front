import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

/** Bandeau discret en haut de l'écran (sous la barre de statut) tant que le réseau est perdu. */
function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[calc(0.5rem+var(--safe-top))]" role="status" aria-live="polite">
      <p className="inline-flex items-center gap-2 rounded-full bg-[#0B132B]/95 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-slate-900/20 backdrop-blur">
        <WifiOff aria-hidden size={15} className="text-[#F59E0B]" /> Vous êtes hors ligne
      </p>
    </div>
  )
}

export default OfflineBanner
