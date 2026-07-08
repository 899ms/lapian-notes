import type { Segment, SegmentImportance, VisualTimelineBlock } from '../types'

export interface NormalizedTimelineBlock {
  primaryLine: string
  isShared: boolean
  sharedLines: string[]
  importance: SegmentImportance
  structureRole: string
}

export function normalizeTimelineBlock(segment: Segment, lineId: string): NormalizedTimelineBlock {
  const primaryLine = segment.primaryLine?.trim() || lineId
  const rawSharedLines = Array.isArray(segment.sharedLines) ? segment.sharedLines : []
  const sharedLines = uniqueLines([primaryLine, ...rawSharedLines])
  const importance = normalizeImportance(segment.importance)
  const isShared = segment.isShared ?? sharedLines.length > 1

  return {
    primaryLine,
    isShared,
    sharedLines,
    importance,
    structureRole: segment.structureRole?.trim() || '',
  }
}

export function ensureTimelineBlockPatch(patch: Partial<Segment>, fallbackLineId: string): Partial<Segment> {
  const primaryLine = patch.primaryLine?.trim() || fallbackLineId
  const sharedLines = uniqueLines([primaryLine, ...(patch.sharedLines ?? [])])
  const importance = normalizeImportance(patch.importance)
  return {
    ...patch,
    primaryLine,
    sharedLines,
    isShared: patch.isShared ?? sharedLines.length > 1,
    importance,
  }
}

export function buildVisualBlocks(
  blocks: Segment[],
  expandSharedBlocks: boolean,
  resolveLineId: (block: Segment) => string,
): VisualTimelineBlock[] {
  return blocks.flatMap((block) => {
    const baseLine = resolveLineId(block)
    const normalized = normalizeTimelineBlock(block, baseLine)
    const shouldExpand = expandSharedBlocks && normalized.isShared && normalized.sharedLines.length > 1

    if (!shouldExpand) {
      return [toVisualBlock(block, normalized.primaryLine, normalized.primaryLine)]
    }

    return normalized.sharedLines.map((lineId) => toVisualBlock(block, lineId, normalized.primaryLine))
  })
}

function toVisualBlock(block: Segment, renderLine: string, primaryLine: string): VisualTimelineBlock {
  return {
    ...block,
    visualId: `${block.id}__${renderLine}`,
    renderLine,
    isPrimaryVisual: renderLine === primaryLine,
  }
}

function normalizeImportance(value: Segment['importance']): SegmentImportance {
  if (value === 'key' || value === 'pivot') return value
  return 'normal'
}

function uniqueLines(lines: string[]): string[] {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))]
}
