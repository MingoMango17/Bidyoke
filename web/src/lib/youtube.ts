declare global {
  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api'

let apiPromise: Promise<typeof YT> | undefined

export function loadYouTubeApi(): Promise<typeof YT> {
  apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = API_SRC
    tag.onerror = () => {
      apiPromise = undefined
      reject(new Error('Could not load the YouTube player.'))
    }
    document.head.append(tag)
  })
  return apiPromise
}

export const PLAYER_STATE_ENDED = 0
export const PLAYER_STATE_PLAYING = 1
export const PLAYER_STATE_PAUSED = 2

export const PlaybackFailure = {
  EmbedBlocked: 'embed_blocked',
  Error: 'playback_error',
  Unavailable: 'playback_unavailable',
} as const

export function errorReason(code: number): string {
  return code === 101 || code === 150 ? PlaybackFailure.EmbedBlocked : PlaybackFailure.Error
}
