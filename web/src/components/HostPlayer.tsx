import { useEffect, useState } from 'react'
import { usePlayback } from '../api/songs'
import type { Identity } from '../lib/identity'
import { PlaybackFailure } from '../lib/youtube'
import { Command, PlayerStatus, SongSource } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { buttonClass, Card } from './Layout'
import { YouTubePlayer } from './YouTubePlayer'

interface Props {
  identity: Identity
  session: SessionApi
}

const controlClass =
  'rounded-lg border border-zinc-300 px-4 py-2 font-medium disabled:opacity-40 dark:border-zinc-700'

export function HostPlayer({ identity, session }: Props) {
  const [started, setStarted] = useState(false)
  const state = session.state
  const item = state?.nowPlaying ?? undefined
  const itemId = item?.itemId
  const playback = usePlayback(started ? item?.song.songId : undefined, identity.token)
  const { send } = session

  useEffect(() => {
    if (itemId && playback.isError) send(Command.PlayerError, { itemId, reason: PlaybackFailure.Unavailable })
  }, [itemId, playback.isError, send])

  if (!started) {
    return (
      <Card title="Ready to start?">
        <p className="mb-3 text-sm text-zinc-500">
          Tap once so the browser allows sound, then songs play automatically.
        </p>
        <button className={buttonClass} onClick={() => setStarted(true)}>
          Start session
        </button>
      </Card>
    )
  }

  const playing = state?.player.status === PlayerStatus.Playing
  const info = playback.data?.playback

  let screen
  if (!item) {
    screen = <p className="p-6 text-zinc-400">Waiting for the first song…</p>
  } else if (info?.kind === SongSource.Local) {
    screen = <p className="p-6 text-zinc-400">Library songs can't be played here yet.</p>
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
    screen = <p className="p-6 text-zinc-400">Loading song…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">{screen}</div>
      {item && (
        <p className="truncate text-lg font-semibold">
          {item.song.title}
          {item.song.artist && <span className="font-normal text-zinc-500"> · {item.song.artist}</span>}
        </p>
      )}
      <div className="flex gap-2">
        <button
          className={controlClass}
          disabled={!item}
          onClick={() => send(playing ? Command.PlayerPause : Command.PlayerResume)}
        >
          {playing ? 'Pause' : 'Resume'}
        </button>
        <button className={controlClass} disabled={!item} onClick={() => send(Command.PlayerNext)}>
          Next
        </button>
      </div>
    </div>
  )
}
