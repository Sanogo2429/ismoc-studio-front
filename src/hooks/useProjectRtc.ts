import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { HubConnection, HubConnectionState } from '@microsoft/signalr'
import { api } from '../services/api'
import { apiErrorMessage } from '../services/apiError'
import { unlockCallAudio } from '../services/callAudio'
import type { ClientMessage, ProjectMilestone, ProjectStatus } from '../services/projectTypes'
import { connectResilientHub, type HubStatus } from '../services/realtimeHub'
import { readCache, writeCache, writePreference } from '../services/sessionCache'

export type { HubStatus }

/** Dernière conversation ouverte (préchargée à la prochaine visite de Messages). */
export const LAST_CONVERSATION_KEY = 'last-conversation'
const MAX_CACHED_MESSAGES = 200
const messagesKey = (projectId: string) => `messages:${projectId}`

/** Charge l'historique d'une conversation dans le cache de l'onglet, sans attendre l'ouverture de la page. */
export function prefetchMessages(projectId: string): void {
  api.get<ClientMessage[]>(`/api/Projects/${encodeURIComponent(projectId)}/client-messages`)
    .then((response) => writeCache(messagesKey(projectId), response.data.slice(-MAX_CACHED_MESSAGES)))
    .catch(() => undefined)
}

/** Diffusé par POST /api/Projects/{id}/progress. */
export interface ProjectLiveUpdate {
  status: ProjectStatus
  step: number
  milestones: ProjectMilestone[]
}

export type CallType = 'audio' | 'video'
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active'
export type ProjectRtc = ReturnType<typeof useProjectRtc>

/** Message en attente d'envoi (hors ligne ou réseau coupé) : affiché avec un indicateur, envoyé au retour du réseau. */
export interface OutgoingMessage {
  localId: string
  content: string
  /** Pièce jointe ou note vocale à téléverser avant l'envoi. */
  file: File | null
  /** URL de la pièce jointe déjà téléversée (évite un second envoi du fichier lors d'une nouvelle tentative). */
  uploadedUrl: string | null
  messageType: 'text' | 'sticker' | 'voice'
  audioDurationSeconds: number | null
  createdAt: string
  state: 'waiting' | 'sending'
}

type NewMessage = Pick<OutgoingMessage, 'content' | 'file' | 'messageType' | 'audioDurationSeconds'>

const OUTBOX_RETRY_MS = 15_000

/** Identité et horodatage d'un message mis en attente (appelé au moment de l'envoi, jamais pendant le rendu). */
function newOutgoingMeta(): Pick<OutgoingMessage, 'localId' | 'createdAt'> {
  return { localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() }
}

/**
 * Échec dû au réseau (hors ligne, requête sans réponse, temps réel coupé pendant l'envoi) : le message est mis en
 * attente. Un refus métier (HubException, réponse HTTP d'erreur) n'est jamais mis en attente : il est affiché.
 */
function isNetworkFailure(error: unknown): boolean {
  if (!navigator.onLine) return true
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error
  if (axios.isAxiosError(cause)) return !cause.response
  const raw = cause instanceof Error ? cause.message : ''
  if (/HubException/.test(raw)) return false
  return cause instanceof Error
}

const RING_TIMEOUT_MS = 45_000
const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]

/**
 * Fusionne l'historique du serveur avec les messages déjà affichés (sans doublon, ordre chronologique) :
 * récupère ce qui est arrivé pendant une coupure du temps réel.
 */
function mergeMessages(server: ClientMessage[], current: ClientMessage[]): ClientMessage[] {
  const byId = new Map(server.map((message) => [message.id, message]))
  for (const message of current) if (!byId.has(message.id)) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
}

function mediaErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Accès au micro/à la caméra refusé. Autorisez-le dans votre navigateur puis réessayez.'
    if (error.name === 'NotFoundError') return 'Aucun micro ou caméra détecté sur cet appareil.'
    if (error.name === 'NotReadableError') return 'Le micro ou la caméra est déjà utilisé par une autre application.'
  }
  return 'Impossible d’accéder au micro ou à la caméra.'
}

/**
 * Communication temps réel d'un projet : messagerie SignalR, présence de l'équipe
 * et appels audio/vidéo WebRTC pair-à-pair (signalisation via le hub).
 */
export function useProjectRtc(projectId: string) {
  const [hubStatus, setHubStatus] = useState<HubStatus>('connecting')
  // Historique déjà connu (cache de l'onglet) affiché immédiatement, puis complété par l'API.
  const [messages, setMessages] = useState<ClientMessage[]>(() => readCache<ClientMessage[]>(messagesKey(projectId)) ?? [])
  // Historique pas encore reçu : la messagerie affiche des squelettes, pas « Aucun message ».
  const [isLoadingMessages, setIsLoadingMessages] = useState(() => readCache(messagesKey(projectId)) === undefined)

  // Mémorise la conversation (affichage instantané au prochain passage) et la dernière ouverte.
  useEffect(() => {
    if (!projectId) return
    writePreference(LAST_CONVERSATION_KEY, projectId)
    if (!isLoadingMessages) writeCache(messagesKey(projectId), messages.slice(-MAX_CACHED_MESSAGES))
  }, [isLoadingMessages, messages, projectId])
  const [isTeamOnline, setIsTeamOnline] = useState(false)
  const [isClientOnline, setIsClientOnline] = useState(false)
  const [projectUpdate, setProjectUpdate] = useState<ProjectLiveUpdate | null>(null)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [callType, setCallType] = useState<CallType>('video')
  const [incomingCaller, setIncomingCaller] = useState('')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null)
  const [callNotice, setCallNotice] = useState('')
  // File d'attente des messages (hors ligne) : l'état pour l'affichage, la référence pour l'envoi séquentiel.
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([])
  const [outboxError, setOutboxError] = useState('')
  const outboxRef = useRef<OutgoingMessage[]>([])
  const isFlushingRef = useRef(false)
  const flushOutboxRef = useRef<() => Promise<void>>(async () => undefined)

  const connectionRef = useRef<HubConnection | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const callStatusRef = useRef<CallStatus>('idle')
  const callTypeRef = useRef<CallType>('video')
  const ringTimerRef = useRef<number | null>(null)

  function updateCallStatus(status: CallStatus) {
    callStatusRef.current = status
    setCallStatus(status)
  }

  function appendMessage(message: ClientMessage) {
    setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
  }

  function clearRingTimer() {
    if (ringTimerRef.current !== null) {
      window.clearTimeout(ringTimerRef.current)
      ringTimerRef.current = null
    }
  }

  /** Libère toutes les ressources de l'appel (pair, pistes caméra/micro, états). */
  function cleanupCall(notice = '') {
    clearRingTimer()
    const peer = peerRef.current
    if (peer) {
      peer.ontrack = null
      peer.onicecandidate = null
      peer.onconnectionstatechange = null
      peer.close()
    }
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    pendingCandidatesRef.current = []
    setLocalStream(null)
    setRemoteStream(null)
    setIsMicMuted(false)
    setIsCameraOff(false)
    setCallStartedAt(null)
    setIncomingCaller('')
    updateCallStatus('idle')
    setCallNotice(notice)
  }

  async function acquireMedia(type: CallType): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Votre navigateur ne permet pas les appels (HTTPS ou localhost requis).')
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }

  function createPeer(stream: MediaStream): RTCPeerConnection {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    stream.getTracks().forEach((track) => peer.addTrack(track, stream))

    peer.ontrack = (event) => {
      const [stream0] = event.streams
      setRemoteStream(stream0 ?? new MediaStream([event.track]))
    }
    peer.onicecandidate = (event) => {
      if (event.candidate) void connectionRef.current?.invoke('SendIceCandidate', projectId, JSON.stringify(event.candidate.toJSON())).catch(() => undefined)
    }
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected' && callStatusRef.current !== 'active') {
        clearRingTimer()
        updateCallStatus('active')
        setCallStartedAt(Date.now())
      } else if (peer.connectionState === 'failed') {
        void connectionRef.current?.invoke('RejectOrEndCall', projectId).catch(() => undefined)
        cleanupCall('La connexion de l’appel a échoué (réseau ou pare-feu).')
      }
    }

    peerRef.current = peer
    return peer
  }

  async function flushPendingCandidates() {
    const peer = peerRef.current
    if (!peer?.remoteDescription) return
    const pending = pendingCandidatesRef.current.splice(0)
    for (const candidate of pending) {
      await peer.addIceCandidate(candidate).catch(() => undefined)
    }
  }

  // Les gestionnaires SignalR, enregistrés une fois par connexion, appellent toujours la version courante.
  const actionsRef = useRef({ appendMessage, cleanupCall, clearRingTimer, createPeer, flushPendingCandidates, updateCallStatus })
  useEffect(() => {
    actionsRef.current = { appendMessage, cleanupCall, clearRingTimer, createPeer, flushPendingCandidates, updateCallStatus }
  })

  // ------------------------------------------------------------------
  // Connexion SignalR
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) return
    let isActive = true
    const { appendMessage, cleanupCall, clearRingTimer, createPeer, flushPendingCandidates, updateCallStatus } = {
      appendMessage: (message: ClientMessage) => actionsRef.current.appendMessage(message),
      cleanupCall: (notice?: string) => actionsRef.current.cleanupCall(notice),
      clearRingTimer: () => actionsRef.current.clearRingTimer(),
      createPeer: (stream: MediaStream) => actionsRef.current.createPeer(stream),
      flushPendingCandidates: () => actionsRef.current.flushPendingCandidates(),
      updateCallStatus: (status: CallStatus) => actionsRef.current.updateCallStatus(status),
    }

    const loadMessages = () => api.get<ClientMessage[]>(`/api/Projects/${encodeURIComponent(projectId)}/client-messages`)
      .then((response) => { if (isActive) setMessages((current) => mergeMessages(response.data, current)) })
      .catch(() => undefined)
      .finally(() => { if (isActive) setIsLoadingMessages(false) })
    void loadMessages()

    const hub = connectResilientHub({
      configure: registerHandlers,
      onStatus: (status) => {
        if (!isActive) return
        setHubStatus(status)
        if (status !== 'connected') {
          setIsTeamOnline(false)
          setIsClientOnline(false)
        }
      },
      // Chaque (re)connexion : rejoindre la salle du projet, puis rattraper les messages manqués
      // (aussi au premier démarrage : couvre ceux arrivés entre le chargement initial et l'entrée dans la salle).
      onConnected: async () => {
        await joinRoom()
        await loadMessages()
        // Temps réel rétabli : les messages en attente partent.
        void flushOutboxRef.current()
      },
    })
    const connection = hub.connection
    connectionRef.current = connection

    function joinRoom() {
      return connection.invoke<boolean>('JoinProjectRoom', projectId).then((online) => { if (isActive) setIsTeamOnline(online) })
    }

    function registerHandlers(connection: HubConnection) {
      connection.on('ReceiveProjectMessage', (message: ClientMessage) => appendMessage(message))
      connection.on('PresenceUpdated', (online: boolean) => setIsTeamOnline(online))
      connection.on('ClientPresenceUpdated', (online: boolean) => setIsClientOnline(online))
      // L'équipe a fait avancer l'étape ou publié un jalon : la page projet se met à jour sans recharger.
      connection.on('ProjectUpdated', (update: ProjectLiveUpdate) => setProjectUpdate(update))

      connection.on('IncomingCall', (callerName: string, type: CallType) => {
        if (callStatusRef.current !== 'idle') {
          void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
          return
        }
        callTypeRef.current = type
        setCallType(type)
        setIncomingCaller(callerName)
        setCallNotice('')
        updateCallStatus('incoming')
      })

      // L'appelé a décroché : l'appelant crée l'offre WebRTC.
      connection.on('CallAccepted', async () => {
        if (callStatusRef.current !== 'outgoing' || !localStreamRef.current) return
        clearRingTimer()
        updateCallStatus('connecting')
        try {
          const peer = createPeer(localStreamRef.current)
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          await connection.invoke('SendWebRtcOffer', projectId, JSON.stringify(offer))
        } catch {
          void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
          cleanupCall('Impossible d’établir l’appel.')
        }
      })

      connection.on('ReceiveWebRtcOffer', async (sdp: string) => {
        const peer = peerRef.current
        if (!peer) return
        try {
          await peer.setRemoteDescription(JSON.parse(sdp) as RTCSessionDescriptionInit)
          await flushPendingCandidates()
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          await connection.invoke('SendWebRtcAnswer', projectId, JSON.stringify(answer))
        } catch {
          void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
          cleanupCall('Impossible d’établir l’appel.')
        }
      })

      connection.on('ReceiveWebRtcAnswer', async (sdp: string) => {
        const peer = peerRef.current
        if (!peer || peer.signalingState !== 'have-local-offer') return
        await peer.setRemoteDescription(JSON.parse(sdp) as RTCSessionDescriptionInit).catch(() => undefined)
        await flushPendingCandidates()
      })

      connection.on('ReceiveIceCandidate', async (candidateJson: string) => {
        const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit
        const peer = peerRef.current
        if (peer?.remoteDescription) await peer.addIceCandidate(candidate).catch(() => undefined)
        else pendingCandidatesRef.current.push(candidate)
      })

      connection.on('CallEnded', () => {
        if (callStatusRef.current === 'idle') return
        const wasRinging = callStatusRef.current === 'outgoing'
        cleanupCall(wasRinging ? 'L’appel a été refusé.' : 'L’appel est terminé.')
      })
    }

    return () => {
      isActive = false
      if (callStatusRef.current !== 'idle') void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
      cleanupCall()
      connectionRef.current = null
      void hub.dispose()
    }
  }, [projectId])

  // ------------------------------------------------------------------
  // Actions exposées
  // ------------------------------------------------------------------

  /**
   * Envoie un message typé (SignalR, avec repli REST si le temps réel est indisponible).
   * Sticker : content = identifiant du sticker. Vocal : attachmentUrl = note vocale + durée.
   */
  async function sendMessage(content: string, attachmentUrl?: string | null, options: { messageType?: 'text' | 'sticker' | 'voice'; audioDurationSeconds?: number | null } = {}): Promise<void> {
    const messageType = options.messageType ?? 'text'
    const audioDurationSeconds = options.audioDurationSeconds ?? null
    const connection = connectionRef.current
    try {
      if (connection?.state === HubConnectionState.Connected) {
        const message = await connection.invoke<ClientMessage>('SendTypedProjectMessage', projectId, messageType, content, attachmentUrl ?? null, audioDurationSeconds)
        appendMessage(message)
        return
      }
      const response = await api.post<ClientMessage>(`/api/Projects/${encodeURIComponent(projectId)}/client-messages`, { content, attachmentUrl, messageType, audioDurationSeconds })
      appendMessage(response.data)
    } catch (error: unknown) {
      // Les erreurs du hub (HubException) arrivent préfixées : on garde le message métier.
      const raw = error instanceof Error ? error.message : ''
      const hubMessage = raw.match(/HubException: (.+)$/)?.[1]
      throw new Error(hubMessage ?? apiErrorMessage(error, 'Le message n’a pas pu être envoyé.'), { cause: error })
    }
  }

  function updateOutbox(update: (items: OutgoingMessage[]) => OutgoingMessage[]) {
    outboxRef.current = update(outboxRef.current)
    setOutbox(outboxRef.current)
  }

  /** Téléverse le fichier éventuel (une seule fois) puis envoie le message. */
  async function deliver(item: OutgoingMessage): Promise<void> {
    let url = item.uploadedUrl
    if (item.file && !url) {
      url = (item.messageType === 'voice' ? await uploadVoiceNote(item.file) : await uploadAttachment(item.file)).url
      const uploadedUrl = url
      updateOutbox((items) => items.map((entry) => entry.localId === item.localId ? { ...entry, uploadedUrl } : entry))
    }
    await sendMessage(item.content, url, { messageType: item.messageType, audioDurationSeconds: item.audioDurationSeconds })
  }

  /** Envoie les messages en attente, dans l'ordre ; s'arrête au premier échec réseau (nouvelle tentative plus tard). */
  async function flushOutbox(): Promise<void> {
    if (isFlushingRef.current || !navigator.onLine || outboxRef.current.length === 0) return
    isFlushingRef.current = true
    try {
      while (outboxRef.current.length > 0) {
        const item = outboxRef.current[0]
        updateOutbox((items) => items.map((entry) => entry.localId === item.localId ? { ...entry, state: 'sending' } : entry))
        try {
          await deliver(outboxRef.current.find((entry) => entry.localId === item.localId) ?? item)
          updateOutbox((items) => items.filter((entry) => entry.localId !== item.localId))
        } catch (error: unknown) {
          if (isNetworkFailure(error)) {
            updateOutbox((items) => items.map((entry) => entry.localId === item.localId ? { ...entry, state: 'waiting' } : entry))
            break
          }
          // Refus métier : le message est retiré de la file et l'utilisateur est prévenu.
          updateOutbox((items) => items.filter((entry) => entry.localId !== item.localId))
          setOutboxError(error instanceof Error && error.message ? error.message : 'Un message en attente n’a pas pu être envoyé.')
        }
      }
    } finally {
      isFlushingRef.current = false
    }
  }
  useEffect(() => { flushOutboxRef.current = flushOutbox })

  // Retour du réseau : envoi immédiat ; tant que la file n'est pas vide, nouvelle tentative régulière.
  useEffect(() => {
    const onOnline = () => void flushOutboxRef.current()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])
  useEffect(() => {
    if (outbox.length === 0) return
    const timer = window.setInterval(() => void flushOutboxRef.current(), OUTBOX_RETRY_MS)
    return () => window.clearInterval(timer)
  }, [outbox.length])

  /**
   * Envoie un message (texte, sticker, note vocale, pièce jointe). Hors ligne ou en cas de coupure réseau, il est mis
   * en attente et part automatiquement au retour du réseau. Retourne 'queued' dans ce cas.
   */
  async function queueMessage(message: NewMessage): Promise<'sent' | 'queued'> {
    setOutboxError('')
    const item: OutgoingMessage = {
      ...message,
      ...newOutgoingMeta(),
      uploadedUrl: null,
      state: 'waiting',
    }
    // Hors ligne, ou d'autres messages déjà en attente (ordre conservé) : mise en file.
    if (!navigator.onLine || outboxRef.current.length > 0) {
      updateOutbox((items) => [...items, item])
      void flushOutbox()
      return 'queued'
    }
    try {
      await deliver(item)
      return 'sent'
    } catch (error: unknown) {
      if (!isNetworkFailure(error)) throw error
      updateOutbox((items) => [...items, { ...item, uploadedUrl: outboxRef.current.find((entry) => entry.localId === item.localId)?.uploadedUrl ?? null }])
      return 'queued'
    }
  }

  /** Téléverse une note vocale (signature audio vérifiée côté serveur) et retourne son URL protégée. */
  async function uploadVoiceNote(audio: File): Promise<{ url: string }> {
    const form = new FormData()
    form.append('file', audio, audio.name)
    try {
      const response = await api.post<{ url: string }>(`/api/Projects/${encodeURIComponent(projectId)}/voice-notes`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      return response.data
    } catch (error: unknown) {
      throw new Error(apiErrorMessage(error, 'La note vocale n’a pas pu être envoyée.'), { cause: error })
    }
  }

  async function startCall(type: CallType) {
    // Encore dans le clic sur « Appel » : on déverrouille l'audio pour la sonnerie (politiques iOS / Android).
    unlockCallAudio()
    const connection = connectionRef.current
    if (callStatusRef.current !== 'idle') return
    if (connection?.state !== HubConnectionState.Connected) {
      setCallNotice('Connexion temps réel indisponible. Réessayez dans un instant.')
      return
    }

    callTypeRef.current = type
    setCallType(type)
    setCallNotice('')
    updateCallStatus('outgoing')
    try {
      await acquireMedia(type)
      await connection.invoke('InitiateCall', projectId, type)
      ringTimerRef.current = window.setTimeout(() => {
        void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
        cleanupCall('Pas de réponse de l’équipe. Laissez-lui un message ou réessayez plus tard.')
      }, RING_TIMEOUT_MS)
    } catch (error: unknown) {
      void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
      cleanupCall(error instanceof Error && !(error instanceof DOMException) ? error.message : mediaErrorMessage(error))
    }
  }

  async function acceptCall() {
    const connection = connectionRef.current
    if (callStatusRef.current !== 'incoming' || !connection) return
    updateCallStatus('connecting')
    try {
      const stream = await acquireMedia(callTypeRef.current)
      createPeer(stream)
      await connection.invoke('AcceptCall', projectId)
    } catch (error: unknown) {
      void connection.invoke('RejectOrEndCall', projectId).catch(() => undefined)
      cleanupCall(error instanceof Error && !(error instanceof DOMException) ? error.message : mediaErrorMessage(error))
    }
  }

  function endCall() {
    void connectionRef.current?.invoke('RejectOrEndCall', projectId).catch(() => undefined)
    cleanupCall()
  }

  function toggleMic() {
    const tracks = localStreamRef.current?.getAudioTracks() ?? []
    const muted = !isMicMuted
    tracks.forEach((track) => { track.enabled = !muted })
    setIsMicMuted(muted)
  }

  function toggleCamera() {
    const tracks = localStreamRef.current?.getVideoTracks() ?? []
    const off = !isCameraOff
    tracks.forEach((track) => { track.enabled = !off })
    setIsCameraOff(off)
  }

  /** Téléverse un fichier joint et retourne son URL à joindre au message. */
  async function uploadAttachment(file: File): Promise<{ url: string; name: string; contentType: string }> {
    const form = new FormData()
    form.append('file', file)
    try {
      const response = await api.post<{ url: string; name: string; contentType: string }>(
        `/api/Projects/${encodeURIComponent(projectId)}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return response.data
    } catch (error: unknown) {
      throw new Error(apiErrorMessage(error, 'Le fichier n’a pas pu être envoyé.'), { cause: error })
    }
  }

  return {
    hubStatus,
    messages,
    isLoadingMessages,
    isTeamOnline,
    isClientOnline,
    projectUpdate,
    callStatus,
    callType,
    incomingCaller,
    localStream,
    remoteStream,
    isMicMuted,
    isCameraOff,
    callStartedAt,
    callNotice,
    dismissCallNotice: () => setCallNotice(''),
    sendMessage,
    queueMessage,
    outbox,
    outboxError,
    dismissOutboxError: () => setOutboxError(''),
    uploadAttachment,
    uploadVoiceNote,
    startCall,
    acceptCall,
    rejectCall: endCall,
    endCall,
    toggleMic,
    toggleCamera,
  }
}
