import type { Project } from '../types'

interface StoredFrame {
  projectId: string
  frameId: string
  index: number
  time: number
  blob?: Blob
  // 旧版本存的是 dataURL 字符串，读取时兼容
  src?: string
  savedAt: string
}

const dbName = 'lapian-notes-frame-store'
const dbVersion = 1
const storeName = 'frames'
const projectIndex = 'projectId'

export async function saveProjectFrameImages(project: Project): Promise<number> {
  const frames = project.frames.filter((frame) => frame.src)
  if (!frames.length) return 0
  const savedAt = new Date().toISOString()
  const entries: StoredFrame[] = []
  for (const frame of frames) {
    try {
      const blob = await (await fetch(frame.src)).blob()
      entries.push({
        projectId: project.id,
        frameId: frame.id,
        index: frame.index,
        time: frame.time,
        blob,
        savedAt,
      })
    } catch {
      // objectURL 已失效的帧跳过，其余照常保存
    }
  }
  if (!entries.length) return 0
  const db = await openFrameDb()
  const existingFrames = await loadProjectFrames(project.id, db)
  await transactionDone(db, 'readwrite', (store) => {
    for (const frame of existingFrames) {
      store.delete(frameKey(project.id, frame.frameId))
    }
    for (const entry of entries) {
      store.put(entry)
    }
  })
  return entries.length
}

export async function restoreProjectFrameImages(project: Project): Promise<{ project: Project; restoredCount: number }> {
  if (!project.frames.length) return { project, restoredCount: 0 }
  const storedFrames = await loadProjectFrames(project.id)
  if (!storedFrames.length) return { project, restoredCount: 0 }
  let restoredCount = 0
  const frames = project.frames.map((frame) => {
    if (frame.src) return frame
    const restored = storedFrames.find((item) => item.frameId === frame.id) ??
      storedFrames.find((item) => item.index === frame.index) ??
      storedFrames.find((item) => Math.abs(item.time - frame.time) < 0.05)
    const src = restored?.blob ? URL.createObjectURL(restored.blob) : restored?.src
    if (!src) return frame
    restoredCount += 1
    return { ...frame, src }
  })
  return { project: { ...project, frames }, restoredCount }
}

export async function clearProjectFrameImages(projectId: string): Promise<void> {
  const db = await openFrameDb()
  const frames = await loadProjectFrames(projectId, db)
  await transactionDone(db, 'readwrite', (store) => {
    for (const frame of frames) {
      store.delete(frameKey(projectId, frame.frameId))
    }
  })
}

async function loadProjectFrames(projectId: string, existingDb?: IDBDatabase): Promise<StoredFrame[]> {
  const db = existingDb ?? await openFrameDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(projectIndex)
    const request = index.getAll(projectId)
    request.onsuccess = () => resolve(request.result as StoredFrame[])
    request.onerror = () => reject(request.error)
  })
}

function openFrameDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: ['projectId', 'frameId'] })
        store.createIndex(projectIndex, projectIndex, { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(db: IDBDatabase, mode: IDBTransactionMode, work: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
    work(store)
  })
}

function frameKey(projectId: string, frameId: string): [string, string] {
  return [projectId, frameId]
}
