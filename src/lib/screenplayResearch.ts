export interface ScreenplaySceneClue {
  index: number
  heading: string
  excerpt: string
  body: string
}

export interface ScreenplaySceneMatch {
  scene: ScreenplaySceneClue
  score: number
  reason: string
}

const SCENE_HEADING_PATTERN =
  /^(?:#{1,6}\s*)?(?:第\s*\d+\s*[场幕]?[\s：:.-]*)?(?:\d{1,4}[\s.、）):：-]+)?(?:(?:内景|外景|内外景|外内景|INT\.?|EXT\.?|INT\/EXT\.?|EXT\/INT\.?)[，,、\s.-].+|.+[，,、\s.-](?:内景|外景|内外景|外内景|INT\.?|EXT\.?)(?:[，,、\s.-].*)?)$/i

export function parseScreenplaySceneClues(text?: string, maxScenes = 80): ScreenplaySceneClue[] {
  const lines = normalizeLines(text)
  if (!lines.length) return []

  const headingIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isSceneHeading(line))
    .slice(0, maxScenes)

  return headingIndexes.map(({ line, index }, sceneIndex) => {
    const nextHeadingIndex = headingIndexes[sceneIndex + 1]?.index ?? lines.length
    const excerpt = lines
      .slice(index + 1, nextHeadingIndex)
      .filter((item) => !isMetadataLine(item))
      .slice(0, 4)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const body = lines
      .slice(index + 1, nextHeadingIndex)
      .filter((item) => !isMetadataLine(item))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      index: sceneIndex + 1,
      heading: line,
      excerpt: trimText(excerpt, 180),
      body: trimText(body, 1200),
    }
  })
}

export function buildScreenplaySceneClueText(text?: string, maxScenes = 40): string {
  const clues = parseScreenplaySceneClues(text, maxScenes)
  if (!clues.length) return text?.trim() ? `未识别到明确场景头，原始资料摘要：${trimText(text, 4000)}` : '未提供'

  const lines = clues.map((scene) => {
    const excerpt = scene.excerpt ? `｜${scene.excerpt}` : ''
    return `${scene.index}. ${scene.heading}${excerpt}`
  })
  return lines.join('\n')
}

export function buildScreenplaySceneDetailText(text?: string, maxScenes = 18, maxSceneLength = 700): string {
  const clues = parseScreenplaySceneClues(text, maxScenes)
  if (!clues.length) return text?.trim() ? trimText(text, Math.max(1000, maxScenes * maxSceneLength)) : '未提供'

  return clues
    .map((scene) => {
      const body = scene.body || scene.excerpt || '（无正文摘录）'
      return `${scene.index}. ${scene.heading}\n${trimText(body, maxSceneLength)}`
    })
    .join('\n\n')
}

export function selectSceneCluesForSegment(text: string | undefined, segmentIndex = 0, segmentTotal = 1, count = 3): ScreenplaySceneClue[] {
  const clues = parseScreenplaySceneClues(text, 120)
  if (!clues.length) return []
  const safeTotal = Math.max(1, segmentTotal)
  const center = Math.round((Math.max(0, segmentIndex) / safeTotal) * Math.max(0, clues.length - 1))
  const start = Math.max(0, center - Math.floor(count / 2))
  return clues.slice(start, start + count)
}

export function matchScreenplayScenes(
  screenplayText: string | undefined,
  segmentText: string,
  segmentIndex = 0,
  segmentTotal = 1,
  count = 3,
): ScreenplaySceneMatch[] {
  const scenes = parseScreenplaySceneClues(screenplayText, 200)
  if (!scenes.length) return []
  const tokens = tokenizeForMatch(segmentText)
  if (!tokens.length) {
    return selectSceneCluesForSegment(screenplayText, segmentIndex, segmentTotal, count).map((scene) => ({
      scene,
      score: 0,
      reason: '按段落位置估算，缺少字幕或文本线索。',
    }))
  }

  const scored = scenes.map((scene) => {
    const sceneTokens = tokenizeForMatch(`${scene.heading} ${scene.body || scene.excerpt}`)
    const overlap = tokens.filter((token) => sceneTokens.includes(token))
    const uniqueOverlap = [...new Set(overlap)]
    const score = uniqueOverlap.length / Math.max(tokens.length, 1)
    return {
      scene,
      score,
      reason: uniqueOverlap.length
        ? `文本命中：${uniqueOverlap.slice(0, 8).join('、')}`
        : '未找到明显文本命中。',
    }
  })

  const strongMatches = scored
    .filter((match) => match.score >= 0.08)
    .sort((a, b) => b.score - a.score || a.scene.index - b.scene.index)
    .slice(0, count)

  if (strongMatches.length) return strongMatches

  return selectSceneCluesForSegment(screenplayText, segmentIndex, segmentTotal, count).map((scene) => ({
    scene,
    score: 0,
    reason: '文本命中不足，按段落位置估算。',
  }))
}

function normalizeLines(text?: string): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function isSceneHeading(line: string): boolean {
  if (line.length < 4 || line.length > 80) return false
  if (isMetadataLine(line)) return false
  return SCENE_HEADING_PATTERN.test(line)
}

function isMetadataLine(line: string): boolean {
  return /^(版权|作者|来源|译|文\/|下文中|《.+》)$/.test(line)
}

function trimText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function tokenizeForMatch(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, ' ')
    .trim()
  const chineseTokens = Array.from(normalized.matchAll(/\p{Script=Han}{2,}/gu)).flatMap((match) => splitChineseToken(match[0]))
  const latinTokens = Array.from(normalized.matchAll(/[a-z0-9]{3,}/g)).map((match) => match[0])
  return [...new Set([...chineseTokens, ...latinTokens].filter((token) => !isStopToken(token)))]
}

function splitChineseToken(token: string): string[] {
  if (token.length <= 4) return [token]
  const tokens: string[] = []
  for (let index = 0; index <= token.length - 2; index += 1) {
    tokens.push(token.slice(index, index + 2))
  }
  for (let index = 0; index <= token.length - 3; index += 1) {
    tokens.push(token.slice(index, index + 3))
  }
  return tokens
}

function isStopToken(token: string): boolean {
  return [
    '这个',
    '那个',
    '他们',
    '我们',
    '你们',
    '自己',
    '没有',
    '什么',
    '一个',
    '一下',
    '这里',
    '那里',
    'the',
    'and',
    'you',
    'that',
  ].includes(token)
}
