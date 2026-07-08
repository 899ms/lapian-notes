import { timecodeToSeconds } from './timecode'

export type AiTimeValue = number | string

export function parseAiTime(value: AiTimeValue | undefined, fallback = 0): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return timecodeToSeconds(trimmed)
}

export function clampTime(value: number, duration: number): number {
  if (!Number.isFinite(value)) return 0
  if (!duration) return Math.max(0, value)
  return Math.max(0, Math.min(duration, value))
}
