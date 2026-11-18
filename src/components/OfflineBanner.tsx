import { useSyncExternalStore } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getConnectionState, retryConnectionNow, subscribeConnectionState } from '../services/connectionMonitor'

/**
 * Bandeau discret en haut de l'écran (sous la barre de statut) :
 * - réseau perdu : « Vous êtes hors ligne » ;
 * - réseau présent mais service muet : « Connexion momentanément indisponible » + Réessayer (vérification
 *   automatique en parallèle). Aucun terme technique à l'écran : les détails sont dans la console.
 */
function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const connection = useSyncExternalStore(subscribeConnectionState, getConnectionState, () => 'available' as const)

  if (isOnline && connection === 'available') return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[calc(0.5rem+var(--safe-top))]" role="status" aria-live="polite">
      {!isOnline ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-[#0B132B]/95 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-slate-900/20 backdrop-blur">
          <WifiOff aria-hidden size={15} className="text-[#F59E0B]" /> Vous êtes hors ligne
        </p>
      ) : (
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-[#0B132B]/95 py-1 pl-4 pr-1 text-[13px] font-medium text-white shadow-lg shadow-slate-900/20 backdrop-blur">
          <span>Connexion momentanément indisponible</span>
          <button className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 font-semibold text-[#F59E0B] transition hover:bg-white/10" onClick={retryConnectionNow} type="button">
            <RefreshCw aria-hidden size={14} /> Réessayer
          </button>
        </div>
      )}
    </div>
  )
}

export default OfflineBanner
