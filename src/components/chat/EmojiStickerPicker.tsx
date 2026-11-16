import { useEffect, useRef, useState } from 'react'
import { EMOJIS, STICKERS } from '../../services/stickers'

interface EmojiStickerPickerProps {
  onClose: () => void
  onEmoji: (emoji: string) => void
  onSticker: (stickerId: string) => void
}

/** Popover emojis (insérés dans le champ) et stickers IsMoc (envoyés en un clic). */
function EmojiStickerPicker({ onClose, onEmoji, onSticker }: EmojiStickerPickerProps) {
  const [tab, setTab] = useState<'emojis' | 'stickers'>('emojis')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div className="absolute bottom-full left-0 z-20 mb-3 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-[#0B132B] shadow-2xl shadow-slate-900/15" ref={panelRef} role="dialog" aria-label="Emojis et stickers">
      <div className="grid grid-cols-2 gap-1 border-b border-slate-100 p-1.5">
        {(['emojis', 'stickers'] as const).map((item) => (
          <button className={`rounded-lg py-2 text-[12px] font-semibold transition ${tab === item ? 'bg-[#0B132B] text-white' : 'text-slate-500 hover:bg-slate-100'}`} key={item} onClick={() => setTab(item)} type="button">
            {item === 'emojis' ? 'Emojis' : 'Stickers IsMoc'}
          </button>
        ))}
      </div>
      {tab === 'emojis' ? (
        <div className="grid grid-cols-8 gap-0.5 p-2">
          {EMOJIS.map((emoji) => (
            <button aria-label={`Insérer ${emoji}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:scale-110 hover:bg-slate-100" key={emoji} onClick={() => onEmoji(emoji)} type="button">{emoji}</button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3">
          {STICKERS.map((sticker) => (
            <button className={`flex items-center gap-2 rounded-xl bg-gradient-to-br px-3 py-2.5 text-left text-[12px] font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${sticker.className}`} key={sticker.id} onClick={() => onSticker(sticker.id)} type="button">
              <span className="text-xl">{sticker.emoji}</span>{sticker.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default EmojiStickerPicker
