import type { Subtitle } from '../types'
import { timecodeToSeconds } from './timecode'

export function parseSubtitle(input: string): Subtitle[] {
  const normalized = input.replace(/^\uFEFF/, '').replace(/\r/g, '')
  if (/\[Events\][\s\S]*?^Dialogue:/m.test(normalized)) return parseAss(normalized)
  if (/WEBVTT/i.test(normalized) || /^\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s+-->/m.test(normalized)) {
    return parseSrtLike(normalized)
  }
  return parseSrtLike(normalized)
}

export function parseSrt(input: string): Subtitle[] {
  return parseSrtLike(input)
}

function parseSrtLike(input: string): Subtitle[] {
  return input
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .replace(/^WEBVTT[^\n]*\n+/i, '')
    .split(/\n{2,}/)
    .map((block, index) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      const timeLineIndex = lines.findIndex((line) => line.includes('-->'))
      if (timeLineIndex < 0) return null
      const [start, end] = lines[timeLineIndex].split('-->').map((part) => cleanTimecode(part))
      const startTime = timecodeToSeconds(start)
      const endTime = timecodeToSeconds(end)
      if (endTime <= startTime) return null
      const text = cleanSubtitleText(lines.slice(timeLineIndex + 1).join('\n'))
      if (!text) return null
      return {
        id: `sub_${String(index + 1).padStart(3, '0')}`,
        startTime,
        endTime,
        text,
      }
    })
    .filter((subtitle): subtitle is Subtitle => Boolean(subtitle))
}

function parseAss(input: string): Subtitle[] {
  const lines = input.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')
  const formatLine = lines.find((line) => line.trim().toLowerCase().startsWith('format:'))
  const fields = formatLine
    ? formatLine.replace(/^format:/i, '').split(',').map((field) => field.trim().toLowerCase())
    : []
  const startIndex = fields.indexOf('start')
  const endIndex = fields.indexOf('end')
  const textIndex = fields.indexOf('text')

  return lines
    .filter((line) => line.trim().toLowerCase().startsWith('dialogue:'))
    .map((line, index) => {
      const raw = line.replace(/^dialogue:\s*/i, '')
      const parts = splitAssDialogue(raw, Math.max(textIndex, 9) + 1)
      const start = parts[startIndex >= 0 ? startIndex : 1]
      const end = parts[endIndex >= 0 ? endIndex : 2]
      const rawText = parts[textIndex >= 0 ? textIndex : 9]
      const startTime = timecodeToSeconds(cleanTimecode(start))
      const endTime = timecodeToSeconds(cleanTimecode(end))
      const text = cleanSubtitleText(rawText)
      if (endTime <= startTime || !text) return null
      return {
        id: `sub_${String(index + 1).padStart(3, '0')}`,
        startTime,
        endTime,
        text,
      }
    })
    .filter((subtitle): subtitle is Subtitle => Boolean(subtitle))
}

function splitAssDialogue(value: string, targetParts: number): string[] {
  const parts = value.split(',')
  if (parts.length <= targetParts) return parts.map((part) => part.trim())
  const head = parts.slice(0, targetParts - 1)
  const tail = parts.slice(targetParts - 1).join(',')
  return [...head, tail].map((part) => part.trim())
}

function cleanTimecode(value: string): string {
  return value
    .trim()
    .split(/\s+/)[0]
    .replace(',', '.')
}

function cleanSubtitleText(value: string): string {
  return value
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}
