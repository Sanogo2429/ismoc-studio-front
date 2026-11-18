/** Stickers IsMoc (identifiants identiques à la liste blanche du backend : ProjectMessaging.Stickers). */
export const STICKERS = [
  { id: 'validated', label: 'Validé', emoji: '✅', className: 'from-emerald-400 to-emerald-600' },
  { id: 'great-idea', label: 'Super idée', emoji: '💡', className: 'from-amber-300 to-amber-500' },
  { id: 'in-dev', label: 'En cours de dev', emoji: '🚀', className: 'from-sky-400 to-indigo-600' },
  { id: 'call-me', label: 'On s’appelle ?', emoji: '📞', className: 'from-violet-400 to-fuchsia-600' },
  { id: 'thanks', label: 'Merci', emoji: '🙏', className: 'from-rose-300 to-rose-500' },
  { id: 'top-design', label: 'Top design', emoji: '🎨', className: 'from-orange-400 to-pink-500' },
  { id: 'urgent', label: 'Urgent', emoji: '⚡', className: 'from-red-500 to-orange-500' },
  { id: 'delivered', label: 'Livré', emoji: '🎉', className: 'from-teal-400 to-cyan-600' },
] as const

export type StickerId = (typeof STICKERS)[number]['id']

export function findSticker(id: string) {
  return STICKERS.find((sticker) => sticker.id === id)
}

export const EMOJIS = [
  '😀', '😂', '😊', '😍', '🤩', '😎', '🤔', '😅',
  '👍', '👏', '🙌', '🙏', '💪', '👌', '✌️', '🤝',
  '❤️', '🔥', '✨', '🎉', '🚀', '💡', '✅', '⭐',
  '📞', '📅', '📎', '💬', '🎨', '📱', '💻', '⚡',
]
