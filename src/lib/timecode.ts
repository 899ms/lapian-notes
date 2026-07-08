export function secondsToTimecode(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = safeSeconds % 60
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':')
}

export function timecodeToSeconds(timecode: string): number {
  const normalized = timecode.trim().replace(',', '.')
  const match = normalized.match(/(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/)
  if (!match) return 0
  const [, hh, mm, ss, ms = '0'] = match
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(`0.${ms.padEnd(3, '0')}`)
}
