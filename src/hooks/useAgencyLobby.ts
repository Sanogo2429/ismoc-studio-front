import { useEffect, useRef, useState } from 'react'
import type { ClientMessage } from '../services/projectTypes'
import { connectResilientHub, type HubStatus } from '../services/realtimeHub'
import type { CallType } from './useProjectRtc'

export interface AgencyCallAlert {
  projectId: string
  callerName: string
  callType: CallType
}

interface AgencyLobbyHandlers {
  onMessage: (projectId: string, message: ClientMessage) => void
  /** Après une coupure du temps réel : recharger les données pour rattraper ce qui a été manqué. */
  onReconnected?: () => void
}

/**
 * Lobby temps réel du cockpit agence : reçoit les nouveaux messages et appels entrants
 * de TOUS les projets (la conversation n'a pas besoin d'être ouverte). Sa présence
 * fait aussi apparaître l'équipe « En ligne » côté clients.
 */
export function useAgencyLobby({ onMessage, onReconnected }: AgencyLobbyHandlers) {
  const [status, setStatus] = useState<HubStatus>('connecting')
  const [callAlert, setCallAlert] = useState<AgencyCallAlert | null>(null)
  const handlersRef = useRef({ onMessage, onReconnected })

  useEffect(() => {
    handlersRef.current = { onMessage, onReconnected }
  })

  useEffect(() => {
    let isActive = true
    const hub = connectResilientHub({
      configure: (connection) => {
        connection.on('AgencyNewMessage', (projectId: string, message: ClientMessage) => handlersRef.current.onMessage(projectId, message))
        connection.on('AgencyIncomingCall', (projectId: string, callerName: string, callType: CallType) => setCallAlert({ projectId, callerName, callType }))
        connection.on('AgencyCallEnded', (projectId: string) => setCallAlert((current) => (current?.projectId === projectId ? null : current)))
      },
      onStatus: (next) => { if (isActive) setStatus(next) },
      onConnected: async (isReconnect) => {
        await hub.connection.invoke('JoinAgencyLobby')
        if (isReconnect && isActive) handlersRef.current.onReconnected?.()
      },
    })

    return () => {
      isActive = false
      void hub.dispose()
    }
  }, [])

  return { status, callAlert, dismissCallAlert: () => setCallAlert(null) }
}
