import type { MacroAnalysis } from '../types'

export const macroProgressFields: Array<{ key: keyof MacroAnalysis; label: string }> = [
  { key: 'overallStructure', label: '结构模型判断' },
  { key: 'narrativeStrategy', label: '主角目标 / 阻力 / 利害' },
  { key: 'rhythmPattern', label: '关键转折 / 高潮 / 解决' },
  { key: 'informationStrategy', label: '信息释放 / 悬念 / 反转' },
  { key: 'coreCreativeIntent', label: '人物变化 / 主题选择' },
  { key: 'writingLessons', label: '可复用方法' },
]

export function getMacroProgress(macro?: MacroAnalysis) {
  const completed = macroProgressFields.filter(({ key }) => hasMacroValue(macro?.[key]))
  const missing = macroProgressFields.filter(({ key }) => !hasMacroValue(macro?.[key])).map((field) => field.label)
  return {
    completed: completed.length,
    total: macroProgressFields.length,
    percent: Math.round((completed.length / macroProgressFields.length) * 100),
    missing,
  }
}

function hasMacroValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => typeof item === 'string' && item.trim().length > 0)
  return typeof value === 'string' && value.trim().length > 0
}
