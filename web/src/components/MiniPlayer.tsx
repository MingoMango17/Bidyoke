import { Pause } from 'lucide-react'
import { playbackProgress } from '../lib/playbackProgress'
import { PlayerStatus, type PositionUpdate, type SessionState } from '../protocol'
import { SongThumb } from './SongRow'
import { ProgressBar } from './ui/ProgressBar'

export function MiniPlayer({ state, position }: { state: SessionState; position?: PositionUpdate }) {
  const progress = playbackProgress(state, position)
  const item = state.nowPlaying
  if (!item) return null
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-2">
      <SongThumb src={item.song.thumbnail} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {state.player.status === PlayerStatus.Paused && <Pause className="size-3.5 shrink-0" aria-label="Paused" />}
          <span className="truncate">{item.song.title}</span>
        </p>
        <ProgressBar positionMs={progress} durationMs={item.song.durationMs} />
      </div>
    </div>
  )
}
