const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_DIMENSION = 2000

export const IMAGE_ACCEPT = ACCEPTED_TYPES.join(',')

export interface ReferenceImage {
  name: string
  dataUrl: string
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Lecture de l’image impossible.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image illisible.'))
    image.src = src
  })
}

/**
 * Prépare une image d’inspiration (photo, croquis, site apprécié) pour le modèle de vision : vérifie le format,
 * réduit les très grandes images (max 2000 px) et retourne une data URL base64.
 */
export async function prepareReferenceImage(file: File): Promise<ReferenceImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Format non pris en charge : utilisez PNG, JPEG, WebP ou GIF.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('L’image dépasse 8 Mo.')

  const original = await readAsDataUrl(file)
  if (file.type === 'image/gif') return { name: file.name, dataUrl: original }

  const image = await loadImage(original)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  if (scale === 1 && file.size <= 3 * 1024 * 1024) return { name: file.name, dataUrl: original }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.88) }
}
