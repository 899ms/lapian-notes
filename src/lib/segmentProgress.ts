import type { Segment } from '../types'

const requiredItems: Array<{ label: string; isComplete: (segment: Segment) => boolean }> = [
  { label: '段落功能', isComplete: (segment) => hasText(segment.segmentFunction) },
  { label: '关键节拍', isComplete: (segment) => hasText(segment.keyBeats) },
  { label: '剧情文本', isComplete: (segment) => hasText(segment.screenplayDraft) },
  { label: '剧本小节', isComplete: (segment) => hasScreenplayBlocks(segment) },
  { label: '观众体验', isComplete: (segment) => hasText(segment.audienceExperience) },
]

export function getSegmentProgress(segment: Segment) {
  const completed = requiredItems.filter((item) => item.isComplete(segment))
  const missing = requiredItems.filter((item) => !item.isComplete(segment)).map((item) => item.label)
  return {
    completed: completed.length,
    total: requiredItems.length,
    percent: Math.round((completed.length / requiredItems.length) * 100),
    missing,
  }
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasScreenplayBlocks(segment: Segment): boolean {
  const blocks = segment.screenplayBlocks?.filter((block) => block.text.trim()) ?? []
  if (!blocks.length) return false
  const hasPlayableBlock = blocks.some((block) => block.type === '动作' || block.type === '对白' || block.type === '手语/字幕')
  const hasOnlyNotes = blocks.every((block) => block.type === '备注')
  return hasPlayableBlock && !hasOnlyNotes
}
