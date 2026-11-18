import { useEffect, useState } from 'react'
import { CONNECTION_RESTORED_EVENT } from '../services/connectionMonitor'

/**
 * Compteur incrémenté à chaque retour du service après une indisponibilité : à placer dans les dépendances d'un
 * chargement de données pour le relancer automatiquement (« Réessayer » ou vérification automatique réussie).
 */
export function useConnectionRestoredKey(): number {
  const [key, setKey] = useState(0)
  useEffect(() => {
    const onRestored = () => setKey((value) => value + 1)
    window.addEventListener(CONNECTION_RESTORED_EVENT, onRestored)
    return () => window.removeEventListener(CONNECTION_RESTORED_EVENT, onRestored)
  }, [])
  return key
}
