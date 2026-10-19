import { Disc3, Pause, Play, SkipForward, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePlayback } from '../api/songs'
import type { Identity } from '../lib/identity'
import { playbackProgress } from '../lib/playbackProgress'
import { PlaybackFailure } from '../lib/youtube'
import { Command, PlayerStatus, SongSource } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { Card } from './Layout'
import { Button } from './ui/Button'
import { ProgressBar } from './ui/ProgressBar'
import { Skeleton } from './ui/Skeleton'
import { YouTubePlayer } from './YouTubePlayer'

interface Props {
  identity: Identity
  session: SessionApi
}

function Stage({ icon: Icon, text }: { icon: typeof Disc3; text: string }) {
  return (
    <div className="grid size-full place-items-center bg-gradient-to-br from-violet-950 to-fuchsia-950 p-6 text-center text-white/80">
      <div className="flex flex-col items-center gap-3">
        <Icon className="size-10" aria-hidden />
        <p>{text}</p>
      </div>
    </div>
  )
}

export function HostPlayer({ identity, session }: Props) {
  const [started, setStarted] = useState(false)
  const state = session.state
  const item = state?.nowPlaying ?? undefined
  const itemId = item?.itemId
  const playback = usePlayback(started ? item?.song.songId : undefined, identity.token)
  const progress = playbackProgress(state)
  const { send } = session

  useEffect(() => {
    if (itemId && playback.isError) send(Command.PlayerError, { itemId, reason: PlaybackFailure.Unavailable })
  }, [itemId, playback.isError, send])

  if (!started) {
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
          <Volume2 className="size-7" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold">Ready to start?</h2>
          <p className="mx-auto mt-1 max-w-sm text-muted">
            Tap once so the browser allows sound, then songs play automatically.
          </p>
        </div>
        <Button size="lg" onClick={() => setStarted(true)}>
          <Play className="size-5" />
          Start session
        </Button>
      </Card>
    )
  }

  const playing = state?.player.status === PlayerStatus.Playing
  const info = playback.data?.playback

  let screen
  if (!item) {
    screen = <Stage icon={Disc3} text="Waiting for the first song…" />
  } else if (info?.kind === SongSource.Local) {
    screen = <Stage icon={Disc3} text="Library songs can't be played here yet." />
  } else if (info?.kind === SongSource.YouTube) {
    screen = (
      <YouTubePlayer
        videoId={info.videoId}
        playing={playing}
        onEnded={() => send(Command.PlayerEnded, { itemId: item.itemId })}
        onError={(reason) => send(Command.PlayerError, { itemId: item.itemId, reason })}
        onPosition={(positionMs) => send(Command.PlayerPosition, { itemId: item.itemId, positionMs })}
      />
    )
  } else {
    screen = <Skeleton className="size-full rounded-none" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">{screen}</div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          {item ? (
            <>
              <p className="truncate font-display text-2xl font-semibold">{item.song.title}</p>
              {item.song.artist && <p className="truncate text-muted">{item.song.artist}</p>}
            </>
          ) : (
            <p className="font-display text-2xl font-semibold text-muted">Nothing playing</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            disabled={!item}
            onClick={() => send(playing ? Command.PlayerPause : Command.PlayerResume)}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            {playing ? 'Pause' : 'Resume'}
          </Button>
          <Button size="lg" variant="secondary" disabled={!item} onClick={() => send(Command.PlayerNext)}>
            <SkipForward className="size-5" />
            Next
          </Button>
        </div>
      </div>
      {item && <ProgressBar positionMs={progress} durationMs={item.song.durationMs} showTimes />}
    </div>
  )
}
