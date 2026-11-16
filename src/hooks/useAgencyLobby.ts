import { useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { api } from '../services/api'
import type { ClientMessage } from '../services/projectTypes'
import type { CallType, HubStatus } from './useProjectRtc'

export interface AgencyCallAlert {
  projectId: string
  callerName: string
  callType: CallType
}

interface AgencyLobbyHandlers {
  onMessage: (projectId: string, message: ClientMessage) => void
}

/**
 * Lobby temps réel du cockpit agence : reçoit les nouveaux messages et appels entrants
 * de TOUS les projets (la conversation n'a pas besoin d'être ouverte). Sa présence
 * fait aussi apparaître l'équipe « En ligne » côté clients.
 */
export function useAgencyLobby({ onMessage }: AgencyLobbyHandlers) {
  const [status, setStatus] = useState<HubStatus>('connecting')
  const [callAlert, setCallAlert] = useState<AgencyCallAlert | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    let isActive = true
    const connection = new HubConnectionBuilder()
      .withUrl(`${api.defaults.baseURL ?? ''}/hubs/project-communication`, { accessTokenFactory: () => localStorage.getItem('token') ?? '' })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('AgencyNewMessage', (projectId: string, message: ClientMessage) => onMessageRef.current(projectId, message))
    connection.on('AgencyIncomingCall', (projectId: string, callerName: string, callType: CallType) => setCallAlert({ projectId, callerName, callType }))
    connection.on('AgencyCallEnded', (projectId: string) => setCallAlert((current) => (current?.projectId === projectId ? null : current)))

    const join = () => connection.invoke('JoinAgencyLobby')
    connection.onreconnecting(() => { if (isActive) setStatus('reconnecting') })
    connection.onreconnected(() => {
      if (!isActive) return
      setStatus('connected')
      void join().catch(() => undefined)
    })
    connection.onclose(() => { if (isActive) setStatus('disconnected') })

    connection.start()
      .then(() => join())
      .then(() => { if (isActive) setStatus('connected') })
      .catch(() => { if (isActive) setStatus('disconnected') })

    return () => {
      isActive = false
      void connection.stop()
    }
  }, [])

  return { status, callAlert, dismissCallAlert: () => setCallAlert(null) }
}
