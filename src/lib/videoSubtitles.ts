import type { Subtitle } from '../types'

const metadataTimeoutMs = 8000

export async function extractEmbeddedSubtitles(file: File, signal?: AbortSignal): Promise<Subtitle[]> {
  const videoUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.src = videoUrl
  video.playsInline = true

  try {
    throwIfAborted(signal)
    await waitForLoadedMetadata(video, signal)
    const tracks = Array.from(video.textTracks)
    if (!tracks.length) return []

    for (const track of tracks) {
      track.mode = 'hidden'
    }

    const cues = await waitForCues(tracks, signal)
    return cues
      .map((cue, index) => cueToSubtitle(cue, index))
      .filter((subtitle): subtitle is Subtitle => Boolean(subtitle))
  } finally {
    video.pause()
    URL.revokeObjectURL(videoUrl)
  }
}

function cueToSubtitle(cue: TextTrackCue, index: number): Subtitle | null {
  const text = cueText(cue)
  if (!text || cue.endTime <= cue.startTime) return null
  return {
    id: `embedded_sub_${String(index + 1).padStart(4, '0')}`,
    startTime: cue.startTime,
    endTime: cue.endTime,
    text,
  }
}

function cueText(cue: TextTrackCue): string {
  if ('text' in cue && typeof cue.text === 'string') {
    return cue.text.replace(/\s+/g, ' ').trim()
  }
  return ''
}

async function waitForCues(tracks: TextTrack[], signal?: AbortSignal): Promise<TextTrackCue[]> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    throwIfAborted(signal)
    const cues = tracks.flatMap((track) => Array.from(track.cues ?? []))
    if (cues.length) return cues.sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime)
    await delay(150, signal)
  }
  return []
}

function waitForLoadedMetadata(video: HTMLVideoElement, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('读取内嵌字幕超时'))
    }, metadataTimeoutMs)

    const handleAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener('loadedmetadata', handleLoaded)
      video.removeEventListener('error', handleError)
      signal?.removeEventListener('abort', handleAbort)
    }

    const handleLoaded = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('无法读取视频字幕轨道'))
    }

    if (signal?.aborted) {
      cleanup()
      reject(createAbortError())
      return
    }

    video.addEventListener('loadedmetadata', handleLoaded, { once: true })
    video.addEventListener('error', handleError, { once: true })
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, ms)

    const handleAbort = () => {
      window.clearTimeout(timer)
      reject(createAbortError())
    }

    if (signal?.aborted) {
      window.clearTimeout(timer)
      reject(createAbortError())
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw createAbortError()
}

function createAbortError() {
  return new DOMException('已取消读取字幕', 'AbortError')
}
