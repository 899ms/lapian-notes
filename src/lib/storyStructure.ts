import type { Segment, SegmentType, Subtitle } from '../types'

export interface StoryLineNode {
  id: string
  label: string
  description: string
  segments: Segment[]
  children: StoryLineNode[]
}

type StoryLineKey = 'main' | 'subplot' | 'emotion' | 'information' | 'rhythm'
type StoryLayerKey = 'setup' | 'progress' | 'turn' | 'resolution'

const storyLines: Record<StoryLineKey, { label: string; description: string }> = {
  main: { label: '主线', description: '围绕核心人物目标、阻力、选择和结果推进。' },
  subplot: { label: '支线', description: '补充副线事件、关系变化或并行任务。' },
  emotion: { label: '情感线', description: '梳理人物关系、情绪转向和主题感受。' },
  information: { label: '信息线', description: '追踪秘密、误会、线索、揭示和反转。' },
  rhythm: { label: '节奏/过渡线', description: '标出停顿、转场、铺垫、释放和段落连接。' },
}

const storyLayers: Record<StoryLayerKey, { label: string; description: string }> = {
  setup: { label: '建立', description: '建立人物、世界、目标、关系或基础信息。' },
  progress: { label: '推进', description: '推动行动、冲突、关系和信息继续发展。' },
  turn: { label: '转折/升级', description: '改变方向、提高压力、暴露新信息或压低人物状态。' },
  resolution: { label: '收束', description: '集中冲突、完成选择、解决结果或留下余韵。' },
}

export function buildStoryStructure(segments: Segment[], subtitles: Subtitle[] = []): StoryLineNode[] {
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime)
  const grouped = createLineBuckets()

  sortedSegments.forEach((segment) => {
    const lineKeys = storyLineKeysForSegment(segment, subtitles)
    lineKeys.forEach((key) => grouped[key].push(segment))
  })

  return (Object.keys(storyLines) as StoryLineKey[])
    .map((key) => {
      const lineSegments = uniqueSegments(grouped[key])
      return {
        id: key,
        label: storyLines[key].label,
        description: storyLines[key].description,
        segments: lineSegments,
        children: buildLayerNodes(key, lineSegments),
      }
    })
    .filter((node) => node.segments.length > 0)
}

export function segmentStructuralRole(segment: Segment): string {
  const baseRole = nonGenericText(segment.segmentFunction) || inferStructuralRole(segment)
  const rhythm = nonGenericText(segment.rhythmDesign) || defaultRhythmRole(segment.type)
  return `${baseRole} 节奏作用：${rhythm}`
}

export function segmentStorySummary(segment: Segment, subtitles: Subtitle[] = []): string {
  const segmentSubtitles = subtitlesInSegment(segment, subtitles)
  const subtitleSummary = summarizeSubtitleStory(segmentSubtitles)
  const actionText = summarizeBlocks(segment, false)
  const draft = nonGenericText(segment.screenplayDraft)
  const title = cleanGeneratedTitle(segment.title)
  const parts = [draft, actionText].filter(Boolean)

  if (parts.length) return truncateText(uniqueParts(parts).join(' '), 220)
  if (title) return `本段围绕“${title}”展开，需要结合画面、字幕和资料整理成完整剧情总结。`
  return subtitleSummary || '待补：这一段还没有形成真正的故事总结。'
}

export function storyLineLabelForSegment(segment: Segment): string {
  return storyLineKeysForSegment(segment).map((key) => storyLines[key].label).join(' / ')
}

export function primaryStoryLineKeyForSegment(segment: Segment, subtitles: Subtitle[] = []): StoryLineKey {
  const keys = storyLineKeysForSegment(segment, subtitles)
  return keys[0] ?? 'main'
}

function createLineBuckets(): Record<StoryLineKey, Segment[]> {
  return {
    main: [],
    subplot: [],
    emotion: [],
    information: [],
    rhythm: [],
  }
}

function buildLayerNodes(lineKey: StoryLineKey, segments: Segment[]): StoryLineNode[] {
  const buckets: Record<StoryLayerKey, Segment[]> = {
    setup: [],
    progress: [],
    turn: [],
    resolution: [],
  }

  segments.forEach((segment) => {
    buckets[storyLayerKeyForSegment(segment)].push(segment)
  })

  return (Object.keys(storyLayers) as StoryLayerKey[])
    .map((key) => ({
      id: `${lineKey}-${key}`,
      label: storyLayers[key].label,
      description: storyLayers[key].description,
      segments: buckets[key],
      children: [],
    }))
    .filter((node) => node.segments.length > 0)
}

function storyLineKeysForSegment(segment: Segment, subtitles: Subtitle[] = []): StoryLineKey[] {
  const text = segmentText(segment, subtitles)
  const keys = new Set<StoryLineKey>()

  if (segment.narrativeOrder === '支线' || segment.type === '支线' || hasAny(text, ['支线', '副线', '旁线', '并行', '另一条线'])) {
    keys.add('subplot')
  }
  if (hasAny(text, ['关系', '情感', '爱情', '亲情', '友情', '家人', '母亲', '父亲', '女儿', '儿子', '共情', '和解'])) {
    keys.add('emotion')
  }
  if (
    segment.type === '背景' ||
    segment.type === '说明' ||
    segment.narrativeOrder === '信息反转' ||
    hasAny(text, ['信息', '秘密', '真相', '误会', '揭示', '反转', '悬念', '线索', '背景'])
  ) {
    keys.add('information')
  }
  if (segment.type === '过渡' || hasAny(text, ['过渡', '转场', '铺垫', '停顿', '缓冲', '释放', '节奏'])) {
    keys.add('rhythm')
  }
  if (!keys.size || segment.narrativeOrder === '主线' || hasAny(text, ['主线', '主角', '目标', '阻力', '选择', '高潮', '冲突'])) {
    keys.add('main')
  }

  return Array.from(keys)
}

function storyLayerKeyForSegment(segment: Segment): StoryLayerKey {
  if (isType(segment.type, ['开场', '起', '背景', '说明'])) return 'setup'
  if (isType(segment.type, ['转', '转折', '升级', '低谷'])) return 'turn'
  if (isType(segment.type, ['合', '高潮', '结尾', '结论'])) return 'resolution'
  return 'progress'
}

function inferStructuralRole(segment: Segment): string {
  const duration = Math.max(0, segment.endTime - segment.startTime)
  const title = cleanGeneratedTitle(segment.title)
  const lineHint = storyLineKeysForSegment(segment).map((key) => storyLines[key].label).join('、')
  const base = title ? `围绕“${title}”这一事件，` : ''
  if (isType(segment.type, ['开场', '起'])) {
    return `${base}建立人物处境、主要关系和观众进入故事的第一组问题。`
  }
  if (segment.type === '冲突') {
    return `${base}把人物目标和阻力摆到台前，让观众看到这一段结束时局面发生了什么受阻或紧张。`
  }
  if (isType(segment.type, ['承', '推进'])) {
    return `${base}推进${lineHint || '剧情线'}，观察本段是否让人物关系、行动方向或信息状态向下一步移动。`
  }
  if (isType(segment.type, ['转', '转折'])) {
    return `${base}制造方向变化，重点判断新信息或人物选择如何改变后续剧情。`
  }
  if (segment.type === '升级') {
    return `${base}提高冲突压力或代价，检查人物是否被迫面对更难的选择。`
  }
  if (segment.type === '低谷') {
    return `${base}压低人物状态，让核心矛盾更清楚，并为后续反弹蓄力。`
  }
  if (segment.type === '高潮') {
    return `${base}集中冲突并推动关键选择，判断人物目标是否在这里被验证或改变。`
  }
  if (isType(segment.type, ['合', '结尾', '结论'])) {
    return `${base}收束人物变化、关系结果和主题余韵。`
  }
  if (duration <= 90 || segment.type === '过渡') {
    return `${base}连接前后情节，判断它是转场、反应、铺垫还是情绪换气。`
  }
  return `${base}需要结合字幕、画面和资料判断它具体改变了哪条剧情线。`
}

function defaultRhythmRole(type: SegmentType): string {
  if (isType(type, ['开场', '起', '背景', '说明'])) return '铺垫和定位。'
  if (isType(type, ['冲突', '升级', '高潮'])) return '加压和加速。'
  if (isType(type, ['转', '转折', '低谷'])) return '转向、停顿或重新蓄力。'
  if (isType(type, ['合', '结尾', '结论'])) return '释放和收束。'
  if (type === '过渡') return '换气、连接和节奏缓冲。'
  return '保持推进并为下一段蓄力。'
}

function uniqueSegments(segments: Segment[]): Segment[] {
  const seen = new Set<string>()
  return segments.filter((segment) => {
    if (seen.has(segment.id)) return false
    seen.add(segment.id)
    return true
  })
}

function segmentText(segment: Segment, subtitles: Subtitle[] = []): string {
  return [
    segment.title,
    segment.type,
    segment.narrativeOrder,
    segment.segmentFunction,
    segment.keyBeats,
    segment.screenplayDraft,
    segment.creativeIntent,
    segment.informationControl,
    segment.rhythmDesign,
    segment.audienceExperience,
    segment.notes,
    subtitlesInSegment(segment, subtitles).map((subtitle) => subtitle.text).join(' '),
  ].filter(Boolean).join(' ')
}

function subtitlesInSegment(segment: Segment, subtitles: Subtitle[]): Subtitle[] {
  return subtitles.filter((subtitle) => subtitle.startTime <= segment.endTime && subtitle.endTime >= segment.startTime)
}

function summarizeSubtitleStory(subtitles: Subtitle[]): string {
  if (!subtitles.length) return ''
  const density = subtitles.length >= 10 ? '密集对白' : subtitles.length >= 4 ? '连续对白' : '少量对白'
  return `本段包含${density}，说明这里存在人物交流或信息释放，但还需要 AI/人工把对白整理成剧情总结。`
}

function summarizeBlocks(segment: Segment, includeDialogue: boolean): string {
  const blocks = segment.screenplayBlocks?.filter((block) => {
    if (!nonGenericText(block.text) || block.type === '场景') return false
    if (!includeDialogue && (block.type === '对白' || block.type === '手语/字幕')) return false
    return true
  }) ?? []
  return blocks
    .slice(0, 3)
    .map((block) => `${block.type}：${nonGenericText(block.text)}`)
    .join(' ')
}

function nonGenericText(value?: string): string {
  const text = value?.replace(/\s+/g, ' ').trim() ?? ''
  if (!text) return ''
  if (/请补成|根据画面补写|本地草稿段|剧情文本起点|先判断它属于|是否承担|当前可先把它当作|待人工|待补|字幕线索|剧本\/剧情线索|可从字幕线索|暂无字幕线索|00:\d{2}:\d{2}|\d+）/.test(text)) return ''
  return text
}

function cleanGeneratedTitle(value?: string): string {
  const title = value
    ?.replace(/（\d{2}:\d{2}:\d{2}.*?）/g, '')
    .replace(/\(\d{2}:\d{2}:\d{2}.*?\)/g, '')
    .split('｜')
    .at(-1)
    ?.trim() ?? ''
  if (!title || /开场建立|目标与阻力出现|关系与行动推进|中段转折|冲突升级|高潮与选择|结局与余韵|剧情推进/.test(title)) return ''
  return title
}

function uniqueParts(parts: string[]): string[] {
  const seen = new Set<string>()
  return parts.filter((part) => {
    const normalized = part.trim()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function isType<T extends string>(value: T, values: T[]): boolean {
  return values.includes(value)
}
