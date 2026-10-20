import { useEffect, useRef, useState } from 'react'
import {
  loadYouTubeApi,
  PLAYER_STATE_ENDED,
  PLAYER_STATE_PAUSED,
  PLAYER_STATE_PLAYING,
  errorReason,
} from '../lib/youtube'

interface Props {
  videoId: string
  playing: boolean
  onEnded: () => void
  onPause: () => void
  onResume: () => void
  onError: (reason: string) => void
  onPosition: (positionMs: number) => void
}

const POSITION_INTERVAL_MS = 1000
const COMMAND_SETTLE_MS = 1500

export function YouTubePlayer(props: Props) {
  const container = useRef<HTMLDivElement>(null)
  const player = useRef<YT.Player | null>(null)
  const latest = useRef(props)
  const ignoreStateUntil = useRef(0)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string>()

  useEffect(() => {
    latest.current = props
  })

  useEffect(() => {
    let cancelled = false
    loadYouTubeApi()
      .then((yt) => {
        if (cancelled || !container.current) return
        const mount = document.createElement('div')
        container.current.append(mount)
        player.current = new yt.Player(mount, {
          width: '100%',
          height: '100%',
          videoId: latest.current.videoId,
          playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
          events: {
            onReady: () => setReady(true),
            onStateChange: (event) => {
              if (event.data === PLAYER_STATE_ENDED) latest.current.onEnded()
              if (Date.now() < ignoreStateUntil.current) return
              if (event.data === PLAYER_STATE_PAUSED && latest.current.playing) latest.current.onPause()
              if (event.data === PLAYER_STATE_PLAYING && !latest.current.playing) latest.current.onResume()
            },
            onError: (event) => latest.current.onError(errorReason(event.data)),
          },
        })
      })
      .catch((error: Error) => setLoadError(error.message))
    return () => {
      cancelled = true
      player.current?.destroy()
      player.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    ignoreStateUntil.current = Date.now() + COMMAND_SETTLE_MS
    player.current?.loadVideoById(props.videoId)
  }, [props.videoId, ready])

  useEffect(() => {
    if (!ready) return
    ignoreStateUntil.current = Date.now() + COMMAND_SETTLE_MS
    if (props.playing) player.current?.playVideo()
    else player.current?.pauseVideo()
  }, [props.playing, props.videoId, ready])

  useEffect(() => {
    if (!ready || !props.playing) return
    const timer = setInterval(() => {
      const seconds = player.current?.getCurrentTime()
      if (seconds !== undefined) latest.current.onPosition(Math.round(seconds * 1000))
    }, POSITION_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [ready, props.playing])

  if (loadError) return <p className="p-4 text-sm text-red-400">{loadError}</p>
  return <div ref={container} className="size-full [&>iframe]:size-full" />
}
