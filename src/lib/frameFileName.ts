import type { Frame } from '../types'
import { secondsToTimecode } from './timecode'

export function frameFileName(frame: Frame, src = frame.src): string {
  return `frame_${String(frame.index + 1).padStart(5, '0')}_${secondsToTimecode(frame.time).replaceAll(':', '-')}${imageExtensionFromDataUrl(src)}`
}

export function possibleFrameFileNames(frame: Frame): string[] {
  const base = `frame_${String(frame.index + 1).padStart(5, '0')}_${secondsToTimecode(frame.time).replaceAll(':', '-')}`
  return [`${base}.jpg`, `${base}.png`, `${base}.webp`]
}

export function imageMimeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

function imageExtensionFromDataUrl(src: string): string {
  if (src.startsWith('data:image/png')) return '.png'
  if (src.startsWith('data:image/webp')) return '.webp'
  return '.jpg'
}
