import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Clock, Download, FileText, LoaderCircle, Mic, Paperclip, Phone, Send, Smile, Video, X } from 'lucide-react'
import type { HubStatus, OutgoingMessage, ProjectRtc } from '../hooks/useProjectRtc'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { api } from '../services/api'
import type { ClientMessage } from '../services/projectTypes'
import { findSticker } from '../services/stickers'
import EmojiStickerPicker from './chat/EmojiStickerPicker'
import { MessageBubblesSkeleton } from './Skeleton'
import VoiceNotePlayer from './chat/VoiceNotePlayer'
import { frenchTypography } from '../services/typography'

const NAVY = '#0B132B'
const AMBER = '#F59E0B'
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ACCEPTED_FILES = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.xlsx,.pptx,.txt,.csv,.zip'

function dayKey(value: string): string {
  return new Date(value).toDateString()
}

function dayLabel(value: string): string {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'AUJOURD’HUI'
  if (date.toDateString() === yesterday.toDateString()) return 'HIER'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).toLocaleUpperCase('fr-FR')
}

function timeOf(value: string): string {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Interlocuteur affiché dans l'en-tête du chat. */
export interface ChatCounterpart {
  title: string
  subtitle: string
  online: boolean
  avatars: string[]
}

interface ChatPanelProps {
  rtc: ProjectRtc
  /** id du champ de saisie (pour « Nous écrire »). */
  inputId?: string
  className?: string
  /** Côté de l'utilisateur : « client » (espace client) ou « team » (cockpit agence). */
  viewer?: 'client' | 'team'
  counterpart?: ChatCounterpart
  /** Téléphone : conversation plein écran (sans bordure, zones sécurisées haut et bas, bouton retour). */
  immersive?: boolean
  /** Bouton ← de l'en-tête (retour à la liste des conversations). */
  onBack?: () => void
}

/** Messagerie temps réel : présence, appels audio/vidéo, pièces jointes. */
export function ChatPanel({ className = 'h-[640px]', counterpart, immersive = false, inputId = 'client-message', onBack, rtc, viewer = 'client' }: ChatPanelProps) {
  const peer = counterpart ?? { title: 'Équipe IsMoc', subtitle: 'Ismael & Moctar', online: rtc.isTeamOnline, avatars: ['IS', 'MO'] }
  const [draft, setDraft] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // Collé au dernier message tant que l'utilisateur ne remonte pas lire l'historique.
  const stickToBottomRef = useRef(true)
  const hasScrolledRef = useRef(false)
  const recorder = useVoiceRecorder()

  const scrollToEnd = useCallback((behavior: ScrollBehavior) => {
    const container = scrollRef.current
    if (container) container.scrollTo({ top: container.scrollHeight, behavior })
  }, [])

  // Nouveau message : défilement vers le bas (instantané au premier affichage, animé ensuite).
  useEffect(() => {
    if (rtc.messages.length === 0 || !stickToBottomRef.current) return
    scrollToEnd(hasScrolledRef.current ? 'smooth' : 'auto')
    hasScrolledRef.current = true
  }, [rtc.messages.length, scrollToEnd])

  // La zone change de taille (clavier qui s'ouvre, image ou note vocale chargée) : on reste sur le dernier message.
  useEffect(() => {
    const container = scrollRef.current
    const list = listRef.current
    if (!container || !list || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => { if (stickToBottomRef.current) scrollToEnd('auto') })
    observer.observe(container)
    observer.observe(list)
    return () => observer.disconnect()
  }, [scrollToEnd])

  // Dernier geste de défilement de l'utilisateur (doigt, molette, clavier) : seul un vrai geste peut
  // décrocher la liste du dernier message — jamais un défilement déclenché par le code ou une mise en page.
  const lastUserGestureRef = useRef(0)
  const markUserGesture = useCallback(() => { lastUserGestureRef.current = Date.now() }, [])

  function handleListScroll() {
    const container = scrollRef.current
    if (!container) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80
    if (nearBottom) stickToBottomRef.current = true
    else if (Date.now() - lastUserGestureRef.current < 1000) stickToBottomRef.current = false
  }

  const closePicker = useCallback(() => setIsPickerOpen(false), [])

  /** Insère l'emoji à la position du curseur. */
  function insertEmoji(emoji: string) {
    const input = textInputRef.current
    const start = input?.selectionStart ?? draft.length
    const end = input?.selectionEnd ?? draft.length
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, 2000)
    setDraft(next)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  async function sendSticker(stickerId: string) {
    setIsPickerOpen(false)
    setChatError('')
    stickToBottomRef.current = true
    try {
      await rtc.queueMessage({ content: stickerId, file: null, messageType: 'sticker', audioDurationSeconds: null })
    } catch (error: unknown) {
      setChatError(error instanceof Error ? error.message : 'Le sticker n’a pas pu être envoyé.')
    }
  }

  async function startRecording() {
    setChatError('')
    setIsPickerOpen(false)
    await recorder.start()
  }

  async function sendVoiceNote() {
    const recording = await recorder.finish()
    if (!recording) {
      setChatError('Enregistrement vide : réessayez.')
      return
    }
    setIsSending(true)
    stickToBottomRef.current = true
    try {
      // Hors ligne : la note vocale est mise en attente et part au retour du réseau.
      await rtc.queueMessage({ content: '', file: recording.file, messageType: 'voice', audioDurationSeconds: recording.seconds })
    } catch (error: unknown) {
      setChatError(error instanceof Error ? error.message : 'La note vocale n’a pas pu être envoyée.')
    } finally {
      setIsSending(false)
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setChatError('Le fichier dépasse 10 Mo.')
      return
    }
    setChatError('')
    setPendingFile(file)
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if ((!content && !pendingFile) || isSending) return
    setChatError('')
    setIsSending(true)
    // Son propre message doit toujours être visible, même si l'on relisait l'historique.
    stickToBottomRef.current = true
    try {
      // Hors ligne ou coupure réseau : le message est mis en attente (indicateur) et part au retour du réseau.
      await rtc.queueMessage({ content, file: pendingFile, messageType: 'text', audioDurationSeconds: null })
      setDraft('')
      setPendingFile(null)
    } catch (error: unknown) {
      setChatError(error instanceof Error && error.message ? error.message : 'Le message n’a pas pu être envoyé.')
    } finally {
      setIsSending(false)
    }
  }

  const groups: Array<{ key: string; label: string; items: ClientMessage[] }> = []
  for (const message of rtc.messages) {
    const key = dayKey(message.sentAt)
    const last = groups.at(-1)
    if (last?.key === key) last.items.push(message)
    else groups.push({ key, label: dayLabel(message.sentAt), items: [message] })
  }

  return (
    <section aria-label="Messagerie avec l’équipe IsMoc" className={`flex flex-col overflow-hidden bg-white text-[#0B132B] ${immersive ? 'chat-immersive' : 'rounded-2xl border border-slate-200/80'} ${className}`}>
      <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 px-4 md:px-6 md:py-5 ${immersive ? 'pb-2.5 pl-1.5 pt-[calc(0.625rem+var(--safe-top))]' : 'py-3'}`}>
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button aria-label="Retour aux conversations" className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0B132B] transition hover:bg-slate-100" onClick={onBack} type="button"><ArrowLeft size={22} /></button>
          )}
          <div className="relative flex -space-x-3">
            {peer.avatars.map((avatar, index) => (
              <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-[12px] font-bold text-white ring-2 ring-white ${index === 0 ? 'from-sky-500 to-indigo-600' : 'from-amber-400 to-orange-600'}`} key={avatar}>{avatar}</span>
            ))}
            <span className={`absolute -bottom-0.5 right-0 h-3 w-3 rounded-full ring-2 ring-white ${peer.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-slate-900">{peer.title}</p>
            <p className="truncate text-[12px] text-slate-500">{peer.subtitle} • <span className={peer.online ? 'text-emerald-600' : 'text-slate-500'}>{peer.online ? 'En ligne' : 'Hors ligne'}</span></p>
          </div>
        </div>
        <div className="flex gap-2.5">
          {/* Appels possibles seulement si l'interlocuteur est en ligne (sinon l'appel sonnerait dans le vide). */}
          <IconSquareButton disabled={rtc.callStatus !== 'idle' || !peer.online} label={peer.online ? 'Appel audio' : 'Appel audio indisponible : hors ligne'} onClick={() => void rtc.startCall('audio')}><Phone size={19} /></IconSquareButton>
          <IconSquareButton disabled={rtc.callStatus !== 'idle' || !peer.online} label={peer.online ? 'Appel vidéo' : 'Appel vidéo indisponible : hors ligne'} onClick={() => void rtc.startCall('video')}><Video size={19} /></IconSquareButton>
        </div>
      </div>

      {/* Seule cette liste défile (overscroll-contain : le geste ne fait jamais glisser la page derrière). */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F8FA] px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6" onKeyDown={markUserGesture} onScroll={handleListScroll} onTouchMove={markUserGesture} onWheel={markUserGesture} ref={scrollRef} aria-live="polite">
        <div ref={listRef}>
          {groups.length === 0 && (rtc.isLoadingMessages
            ? <MessageBubblesSkeleton />
            : <p className="py-16 text-center text-xs text-slate-500">Aucun message pour le moment. Écrivez à l’équipe IsMoc.</p>)}
          {groups.map((group) => (
            <div key={group.key}>
              <p className="my-4 text-center text-[12px] font-semibold tracking-[0.12em] text-slate-500">{group.label}</p>
              <div className="space-y-5">
                {group.items.map((message) => <MessageBubble key={message.id} message={message} viewer={viewer} />)}
              </div>
            </div>
          ))}
          {rtc.outbox.length > 0 && (
            <div className={`space-y-5 ${groups.length > 0 ? 'mt-5' : ''}`}>
              {rtc.outbox.map((item) => <PendingBubble item={item} key={item.localId} />)}
            </div>
          )}
        </div>
      </div>

      {(chatError || recorder.error || rtc.outboxError) && <p className="mx-4 mt-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{chatError || recorder.error || rtc.outboxError}</p>}
      {pendingFile && (
        <div className="mx-4 mt-3 flex shrink-0 items-center gap-2 self-start rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <FileText size={14} /><span className="max-w-[240px] truncate">{pendingFile.name}</span>
          <button aria-label="Retirer la pièce jointe" className="rounded p-0.5 hover:bg-slate-200" onClick={() => setPendingFile(null)} type="button"><X size={13} /></button>
        </div>
      )}
      {recorder.isRecording ? (
        /* ---------------- Enregistrement vocal ---------------- */
        <div className="chat-composer flex shrink-0 items-center gap-3 border-t border-slate-200/80 px-3 py-3 md:px-6 md:py-4" role="status" aria-live="polite">
          <span className="relative flex h-3 w-3 shrink-0"><span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" /><span className="relative h-3 w-3 rounded-full bg-red-500" /></span>
          <span className="text-[13px] font-semibold tabular-nums text-red-600">{formatClock(Math.min(recorder.elapsed, recorder.maxSeconds))}</span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500">{recorder.elapsed >= recorder.maxSeconds ? 'Durée maximale atteinte (3 min)' : 'Enregistrement en cours…'}</span>
          <button className="rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" onClick={recorder.cancel} type="button">Annuler</button>
          <button className="flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-[12px] font-bold text-[#0B132B] transition hover:brightness-95" onClick={() => void sendVoiceNote()} style={{ background: AMBER }} type="button"><Send size={16} /> Envoyer</button>
        </div>
      ) : (
        // Barre de saisie (style messagerie mobile) : capsule [emoji | message | pièce jointe] + bouton rond
        // micro / envoi. Hors de la zone qui défile, elle reste toujours en bas de la conversation.
        <form className="chat-composer relative flex shrink-0 items-center gap-2 border-t border-slate-200/80 bg-white px-2 py-2 max-[359px]:gap-1.5 max-[359px]:px-1.5 md:px-4 md:py-3" onSubmit={handleSend}>
          <input accept={ACCEPTED_FILES} className="hidden" onChange={handleFile} ref={fileInputRef} type="file" />
          {isPickerOpen && <EmojiStickerPicker onClose={closePicker} onEmoji={insertEmoji} onSticker={(stickerId) => void sendSticker(stickerId)} />}
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-slate-200 bg-[#F7F8FA] px-0.5 transition focus-within:border-[#F59E0B] focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-100">
            <ComposerIconButton active={isPickerOpen} label="Emojis et stickers" onClick={() => setIsPickerOpen((open) => !open)}><Smile size={20} /></ComposerIconButton>
            <label className="sr-only" htmlFor={inputId}>Votre message</label>
            <input
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[14px] text-[#0B132B] outline-none placeholder:text-slate-500 max-[359px]:px-0.5"
              enterKeyHint="send"
              id={inputId}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Votre message…"
              ref={textInputRef}
              value={draft}
            />
            <ComposerIconButton label="Joindre un fichier ou une image" onClick={() => fileInputRef.current?.click()}><Paperclip size={19} /></ComposerIconButton>
          </div>
          {/* Champ vide : micro (note vocale). Texte ou pièce jointe : envoi. */}
          {draft.trim() || pendingFile || isSending ? (
            <button aria-label="Envoyer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0B132B] shadow-sm transition hover:brightness-95 disabled:opacity-60" disabled={isSending} style={{ background: AMBER }} type="submit">
              {isSending ? <LoaderCircle className="animate-spin" size={18} /> : <Send className="translate-x-px" size={18} />}
            </button>
          ) : (
            <button aria-label="Enregistrer un message vocal" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0B132B] shadow-sm transition hover:brightness-95" onClick={() => void startRecording()} style={{ background: AMBER }} type="button">
              <Mic size={19} />
            </button>
          )}
        </form>
      )}
    </section>
  )
}

function MessageBubble({ message, viewer }: { message: ClientMessage; viewer: 'client' | 'team' }) {
  const mine = viewer === 'team' ? message.author !== 'client' : message.author === 'client'
  const showAuthor = !mine && message.authorName && message.authorName !== 'Équipe IsMoc'

  // Sticker : carte colorée, sans bulle.
  if (message.messageType === 'sticker') {
    const sticker = findSticker(message.content)
    return (
      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2.5 rounded-2xl bg-gradient-to-br px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-slate-900/10 ${sticker?.className ?? 'from-slate-400 to-slate-600'}`}>
          <span className="text-3xl leading-none">{sticker?.emoji ?? '✨'}</span>{sticker?.label ?? message.attachmentName ?? 'Sticker'}
        </div>
        <p className="mt-1 text-[12px] text-slate-600">{timeOf(message.sentAt)}</p>
      </div>
    )
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-xl px-4 pb-2 pt-3 text-[12.5px] leading-5 ${mine ? 'text-white shadow-md shadow-slate-900/10' : 'border border-slate-200/70 bg-white text-[#0B132B] shadow-sm'}`} style={mine ? { background: NAVY } : undefined}>
        {showAuthor && <p className="mb-1 text-[12px] font-semibold text-[#B8530B]">{message.authorName}</p>}
        {message.messageType === 'voice' && message.attachmentUrl
          ? <VoiceNotePlayer durationSeconds={message.audioDurationSeconds ?? 0} mine={mine} url={message.attachmentUrl} />
          : message.attachmentUrl && <AttachmentPreview contentType={message.attachmentContentType} mine={mine} name={message.attachmentName} url={message.attachmentUrl} />}
        {message.content && <p className="whitespace-pre-line break-words">{frenchTypography(message.content)}</p>}
        <p className={`mt-1 text-right text-[12px] ${mine ? 'text-white/75' : 'text-slate-600'}`}>{timeOf(message.sentAt)}</p>
      </div>
    </div>
  )
}

/** Message en attente d'envoi (hors ligne) : bulle atténuée + indicateur discret. */
function PendingBubble({ item }: { item: OutgoingMessage }) {
  const label = item.messageType === 'voice'
    ? 'Note vocale'
    : item.messageType === 'sticker'
      ? findSticker(item.content)?.label ?? 'Sticker'
      : item.content || item.file?.name || 'Pièce jointe'
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-xl px-4 pb-2 pt-3 text-[12.5px] leading-5 text-white opacity-75 shadow-md shadow-slate-900/10" style={{ background: NAVY }}>
        {item.file && item.messageType !== 'voice' && <p className="mb-1 flex items-center gap-1.5 text-[12px] text-white/80"><FileText size={13} /> {item.file.name}</p>}
        <p className="whitespace-pre-line break-words">{frenchTypography(item.messageType === 'text' ? item.content : label)}</p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[12px] text-white/75">
          {item.state === 'sending'
            ? <><LoaderCircle aria-hidden className="animate-spin" size={11} /> Envoi…</>
            : <><Clock aria-hidden size={11} /> En attente</>}
        </p>
      </div>
    </div>
  )
}

/** Bouton d'icône dans la capsule de saisie (zone tactile 44 × 44 px). */
function ComposerIconButton({ active = false, children, label, onClick }: { active?: boolean; children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} aria-pressed={active} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${active ? 'text-[#B8530B]' : 'text-slate-500 hover:text-[#0B132B]'}`} onClick={onClick} title={label} type="button">
      {children}
    </button>
  )
}

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Les pièces jointes sont protégées par JWT : on les charge en blob via axios. */
function AttachmentPreview({ contentType, mine, name, url }: { contentType?: string | null; mine: boolean; name?: string | null; url: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const isImage = contentType?.startsWith('image/') ?? false

  useEffect(() => {
    if (!isImage) return
    let revoked = false
    let created: string | null = null
    api.get<Blob>(url, { responseType: 'blob' })
      .then((response) => {
        if (revoked) return
        created = URL.createObjectURL(response.data)
        setObjectUrl(created)
      })
      .catch(() => undefined)
    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [url, isImage])

  async function download() {
    const response = await api.get<Blob>(url, { responseType: 'blob' })
    const href = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = href
    link.download = name ?? 'piece-jointe'
    link.click()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  if (isImage) {
    return (
      <button className="mb-2 block overflow-hidden rounded-lg" onClick={() => void download()} title={name ?? undefined} type="button">
        {objectUrl ? <img alt={name ?? 'Image jointe'} className="max-h-56 w-auto max-w-full object-cover" src={objectUrl} /> : <span className="flex h-32 w-48 items-center justify-center bg-slate-100 text-slate-500"><LoaderCircle className="animate-spin" size={16} /></span>}
      </button>
    )
  }

  return (
    <button className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium ${mine ? 'bg-white/10' : 'bg-slate-100'}`} onClick={() => void download()} type="button">
      <FileText size={15} /><span className="max-w-[220px] truncate">{name ?? 'Pièce jointe'}</span><Download size={13} />
    </button>
  )
}

function IconSquareButton({ children, disabled, label, onClick }: { children: ReactNode; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#0B132B] transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled} onClick={onClick} title={label} type="button">
      {children}
    </button>
  )
}

/** État de la connexion temps réel, affiché dans la barre supérieure. */
export function ConnectionIndicator({ status }: { status: HubStatus }) {
  const config = {
    connected: { color: '#22C55E', label: 'Temps réel connecté' },
    connecting: { color: AMBER, label: 'Connexion au temps réel…' },
    reconnecting: { color: AMBER, label: 'Reconnexion au temps réel…' },
    disconnected: { color: '#94A3B8', label: 'Temps réel indisponible' },
  }[status]
  return (
    <span aria-label={config.label} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200" role="status" title={config.label}>
      <span className={`h-3.5 w-3.5 rounded-full border-2 border-slate-300 ${status === 'connecting' || status === 'reconnecting' ? 'animate-spin border-t-transparent' : ''}`} />
      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: config.color }} />
    </span>
  )
}
