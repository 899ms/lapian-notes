import type { Project } from '../types'
import { compactProjectForPersistence, hasMeaningfulProjectContent, normalizeLoadedProject } from './project'

const storageKey = 'lapian-notes.autosave.v1'

export interface AutosaveState {
  project: Project
  savedAt: string
}

export function loadAutosave(): AutosaveState | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const state = JSON.parse(raw) as Partial<AutosaveState>
    const project = normalizeLoadedProject(state.project)
    if (!hasMeaningfulProjectContent(project)) {
      window.localStorage.removeItem(storageKey)
      return null
    }
    return {
      project,
      savedAt: typeof state.savedAt === 'string' ? state.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveAutosave(project: Project): boolean {
  if (!hasMeaningfulProjectContent(project)) {
    window.localStorage.removeItem(storageKey)
    return false
  }
  const state: AutosaveState = {
    project: compactProjectForPersistence(project),
    savedAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearAutosave() {
  window.localStorage.removeItem(storageKey)
}
