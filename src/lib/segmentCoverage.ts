import type { Segment } from '../types'

export interface SegmentCoverage {
  coveredSeconds: number
  percent: number
  gaps: Array<{ startTime: number; endTime: number }>
}

export function getSegmentCoverage(segments: Segment[], duration: number): SegmentCoverage {
  const total = Math.max(0, duration)
  if (!total || !segments.length) {
    return {
      coveredSeconds: 0,
      percent: 0,
      gaps: total ? [{ startTime: 0, endTime: total }] : [],
    }
  }

  const ranges = segments
    .map((segment) => ({
      startTime: clamp(segment.startTime, total),
      endTime: clamp(segment.endTime, total),
    }))
    .filter((range) => range.endTime > range.startTime)
    .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime)

  const merged: Array<{ startTime: number; endTime: number }> = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (!previous || range.startTime > previous.endTime) {
      merged.push({ ...range })
      continue
    }
    previous.endTime = Math.max(previous.endTime, range.endTime)
  }

  const coveredSeconds = merged.reduce((sum, range) => sum + Math.max(0, range.endTime - range.startTime), 0)
  const gaps: Array<{ startTime: number; endTime: number }> = []
  let cursor = 0
  for (const range of merged) {
    if (range.startTime > cursor) gaps.push({ startTime: cursor, endTime: range.startTime })
    cursor = Math.max(cursor, range.endTime)
  }
  if (cursor < total) gaps.push({ startTime: cursor, endTime: total })

  return {
    coveredSeconds,
    percent: Math.round((coveredSeconds / total) * 100),
    gaps,
  }
}

function clamp(value: number, duration: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(duration, value))
}
