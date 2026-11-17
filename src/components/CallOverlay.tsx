import { useEffect, useState, type ReactNode } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import type { CallType, ProjectRtc } from '../hooks/useProjectRtc'
import { useIncomingRingtone, useRingbackTone } from '../hooks/useCallTones'

const NAVY = '#0B132B'

function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])
  if (startedAt === null) return '00:00'
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function StreamVideo({ className, muted, stream }: { className: string; muted?: boolean; stream: MediaStream | null }) {
  return (
    <video
      autoPlay
      className={className}
      muted={muted}
      playsInline
      ref={(element) => { if (element && element.srcObject !== stream) element.srcObject = stream }}
    />
  )
}

function callLabel(type: CallType): string {
  return type === 'audio' ? 'Appel audio' : 'Appel vidéo'
}

/** Bannière d'appel entrant, fenêtre d'appel actif WebRTC (vidéo distante, PiP locale, chrono) et notifications. */
function CallOverlay({ peerName = 'Équipe IsMoc', rtc }: { peerName?: string; rtc: ProjectRtc }) {
  const peerInitials = peerName === 'Équipe IsMoc' ? 'IM' : peerName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || 'IM'
  const elapsed = useElapsed(rtc.callStartedAt)
  const status = rtc.callStatus
  // Sonnerie de retour d'appel tant que l'appel sortant attend une réponse ; coupée dès décroché / refusé / raccroché.
  useRingbackTone(status === 'outgoing')
  // Sonnerie d'appel entrant tant que la notification est affichée ; coupée dès Décrocher / Refuser / appel annulé.
  useIncomingRingtone(status === 'incoming')

  if (status === 'idle') {
    return rtc.callNotice ? (
      <div className="fixed bottom-safe-6 right-6 z-50 max-md:bottom-[calc(5.5rem+var(--safe-bottom))] max-md:left-4 max-md:right-4 flex max-w-sm items-start gap-3 rounded-2xl px-5 py-4 text-sm text-white shadow-2xl" role="status" style={{ background: NAVY }}>
        <PhoneOff className="mt-0.5 shrink-0 text-white/60" size={16} />
        <p className="leading-5">{rtc.callNotice}</p>
        <button aria-label="Fermer" className="shrink-0 rounded p-0.5 text-white/50 hover:text-white" onClick={rtc.dismissCallNotice} type="button"><X size={15} /></button>
      </div>
    ) : null
  }

  if (status === 'incoming') {
    return (
      <div className="fixed left-4 right-4 top-safe-6 z-50 rounded-2xl sm:left-auto sm:right-6 sm:w-[340px] p-5 text-white shadow-2xl ring-1 ring-white/10" role="alertdialog" aria-label="Appel entrant" style={{ background: NAVY }}>
        <div className="flex items-center gap-4">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
            {rtc.callType === 'audio' ? <Phone size={20} /> : <Video size={20} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{rtc.incomingCaller || peerName}</p>
            <p className="text-xs text-white/60">{callLabel(rtc.callType)} entrant…</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold transition hover:bg-red-600" onClick={rtc.rejectCall} type="button"><PhoneOff size={16} /> Refuser</button>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold transition hover:bg-emerald-600" onClick={() => void rtc.acceptCall()} type="button"><Phone size={16} /> Décrocher</button>
        </div>
      </div>
    )
  }

  const showRemoteVideo = rtc.callType === 'video' && rtc.remoteStream !== null
  const statusText = status === 'outgoing' ? 'Appel en cours… en attente de réponse' : status === 'connecting' ? 'Connexion sécurisée…' : elapsed

  return (
    <div aria-label={callLabel(rtc.callType)} aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B132B]/90 p-4 backdrop-blur-md" role="dialog">
      <div className="relative flex h-full max-h-[760px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#060B1A] shadow-2xl ring-1 ring-white/10">
        <div className="relative flex flex-1 items-center justify-center">
          {showRemoteVideo
            ? <StreamVideo className="absolute inset-0 h-full w-full object-cover" stream={rtc.remoteStream} />
            : (
              <div className="flex flex-col items-center text-white">
                <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-3xl font-bold">
                  {status !== 'active' && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/25" />}
                  {peerInitials}
                </span>
                <p className="mt-6 text-xl font-semibold">{peerName}</p>
              </div>
            )}
          {!showRemoteVideo && rtc.remoteStream && <audio autoPlay ref={(element) => { if (element && element.srcObject !== rtc.remoteStream) element.srcObject = rtc.remoteStream }} />}

          <div className="absolute left-6 top-6 rounded-xl bg-black/40 px-4 py-2 text-white backdrop-blur">
            <p className="text-[13px] font-semibold">{callLabel(rtc.callType)} · {peerName}</p>
            <p className="text-[11px] tabular-nums text-white/70">{statusText}</p>
          </div>

          {rtc.callType === 'video' && rtc.localStream && (
            <div className="absolute bottom-6 right-6 aspect-video w-44 overflow-hidden rounded-2xl bg-slate-800 shadow-xl ring-2 ring-white/20 sm:w-56">
              {rtc.isCameraOff
                ? <span className="flex h-full items-center justify-center text-white/50"><VideoOff size={22} /></span>
                : <StreamVideo className="h-full w-full -scale-x-100 object-cover" muted stream={rtc.localStream} />}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 bg-black/30 px-6 py-5">
          <CallControl active={rtc.isMicMuted} label={rtc.isMicMuted ? 'Réactiver le micro' : 'Couper le micro'} onClick={rtc.toggleMic}>{rtc.isMicMuted ? <MicOff size={21} /> : <Mic size={21} />}</CallControl>
          {rtc.callType === 'video' && <CallControl active={rtc.isCameraOff} label={rtc.isCameraOff ? 'Réactiver la caméra' : 'Couper la caméra'} onClick={rtc.toggleCamera}>{rtc.isCameraOff ? <VideoOff size={21} /> : <Video size={21} />}</CallControl>}
          <button aria-label="Raccrocher" className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600" onClick={rtc.endCall} title="Raccrocher" type="button"><PhoneOff size={22} /></button>
        </div>
      </div>
    </div>
  )
}

function CallControl({ active, children, label, onClick }: { active: boolean; children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} aria-pressed={active} className={`flex h-14 w-14 items-center justify-center rounded-full transition ${active ? 'bg-white text-[#0B132B]' : 'bg-white/10 text-white hover:bg-white/20'}`} onClick={onClick} title={label} type="button">
      {children}
    </button>
  )
}

export default CallOverlay
