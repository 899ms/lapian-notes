import type { Project, StoryLine } from '../types'

export const AUDIENCE_LINE_ID = 'audience_experience'

export const defaultStoryLines: StoryLine[] = [
  {
    id: 'protagonist_action',
    title: '主角行动线',
    subtitle: '目标 / 选择 / 行动 / 代价',
    description: '主角的核心目标、关键选择和行动推进',
  },
  {
    id: 'antagonist_pressure',
    title: '对抗压力线',
    subtitle: '阻力 / 威胁 / 危机 / 升级',
    description: '反派、阻力或环境如何制造压力、升级威胁',
  },
  {
    id: 'relationship_emotion',
    title: '关系情感线',
    subtitle: '家人 / 爱人 / 伙伴 / 情感筹码',
    description: '人物关系变化和情感利害',
  },
  {
    id: 'world_context',
    title: '外部世界线',
    subtitle: '社会 / 组织 / 规则 / 决策',
    description: '主冲突之外的世界反应、权力与规则变化',
  },
  {
    id: 'subplot_info',
    title: '支线信息线',
    subtitle: '支线 / 伏笔 / 信息控制',
    description: '支线剧情、伏笔回收和观众信息差设计',
  },
  {
    id: AUDIENCE_LINE_ID,
    title: '观众体验线',
    subtitle: '紧张 / 希望 / 焦虑 / 释放',
    description: '观众情绪曲线，不放剧情卡',
  },
]

// 历史项目里出现过的两套线 id（空军一号、健听女孩时期），导入旧数据时映射到通用线
const legacyLineIds: Record<string, string> = {
  president_action: 'protagonist_action',
  villain_pressure: 'antagonist_pressure',
  family_hostage: 'relationship_emotion',
  white_house_politics: 'world_context',
  military_spatial: 'world_context',
  main: 'protagonist_action',
  action: 'protagonist_action',
  terrorist: 'antagonist_pressure',
  villain: 'antagonist_pressure',
  hostage: 'relationship_emotion',
  family: 'relationship_emotion',
  whitehouse: 'world_context',
  politics: 'world_context',
  military: 'world_context',
  spatial: 'world_context',
  music: 'protagonist_action',
  romance: 'relationship_emotion',
  livelihood: 'world_context',
  information: 'subplot_info',
  emotion: AUDIENCE_LINE_ID,
}

export function getProjectStoryLines(project: Pick<Project, 'storyLines'>): StoryLine[] {
  const custom = (project.storyLines ?? []).filter((line) => line?.id?.trim() && line?.title?.trim())
  if (!custom.length) return defaultStoryLines
  const plotLines = custom.filter((line) => line.id !== AUDIENCE_LINE_ID)
  const audienceLine =
    custom.find((line) => line.id === AUDIENCE_LINE_ID) ??
    defaultStoryLines.find((line) => line.id === AUDIENCE_LINE_ID)!
  return [...plotLines, audienceLine]
}

export function normalizeLineId(value: string | undefined, lines: StoryLine[]): string | undefined {
  const id = value?.trim()
  if (!id) return undefined
  if (lines.some((line) => line.id === id)) return id
  const mapped = legacyLineIds[id]
  if (mapped && lines.some((line) => line.id === mapped)) return mapped
  return lines.find((line) => line.title === id)?.id
}

export interface LineColor {
  main: string
  light: string
  border: string
  text: string
}

const lineColorPalette: LineColor[] = [
  { main: '#D97706', light: '#FEF3C7', border: '#B45309', text: '#78350F' },
  { main: '#DC2626', light: '#FEE2E2', border: '#991B1B', text: '#7F1D1D' },
  { main: '#9333EA', light: '#F3E8FF', border: '#6B21A8', text: '#581C87' },
  { main: '#2563EB', light: '#DBEAFE', border: '#1D4ED8', text: '#1E3A8A' },
  { main: '#059669', light: '#D1FAE5', border: '#047857', text: '#064E3B' },
  { main: '#0891B2', light: '#CFFAFE', border: '#0E7490', text: '#164E63' },
  { main: '#BE185D', light: '#FCE7F3', border: '#9D174D', text: '#831843' },
]

const audienceLineColor: LineColor = { main: '#F59E0B', light: '#FEF9C3', border: '#D97706', text: '#78350F' }

export function lineColor(lineId: string, lines: StoryLine[]): LineColor {
  if (lineId === AUDIENCE_LINE_ID) return audienceLineColor
  const index = lines.filter((line) => line.id !== AUDIENCE_LINE_ID).findIndex((line) => line.id === lineId)
  return lineColorPalette[(index >= 0 ? index : 0) % lineColorPalette.length]
}
