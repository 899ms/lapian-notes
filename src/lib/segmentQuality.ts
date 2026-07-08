import type { Frame, Segment, Subtitle } from '../types'

export interface SegmentQuality {
  duration: number
  frameCount: number
  subtitleCount: number
  warnings: string[]
}

export function getSegmentQuality(segment: Segment, frames: Frame[], subtitles: Subtitle[], frameInterval: number): SegmentQuality {
  const duration = Math.max(0, segment.endTime - segment.startTime)
  const frameCount = frames.filter((frame) => frame.time >= segment.startTime && frame.time <= segment.endTime).length
  const subtitleCount = subtitles.filter((subtitle) => subtitle.startTime <= segment.endTime && subtitle.endTime >= segment.startTime).length
  const warnings: string[] = []

  if (duration <= Math.max(1, frameInterval * 0.5)) {
    warnings.push('段落过短，建议检查起点和终点。')
  }
  if (segment.startFrameId === segment.endFrameId) {
    warnings.push('起点和终点是同一个时间点，可能无法形成完整段落。')
  }
  if (frameCount < 2) {
    warnings.push('段落内代表画面较少，建议扩大范围或补充手动备注。')
  }
  if (subtitleCount === 0) {
    warnings.push('未匹配到字幕，可结合画面手动补充动作和信息变化。')
  }

  return {
    duration,
    frameCount,
    subtitleCount,
    warnings,
  }
}
