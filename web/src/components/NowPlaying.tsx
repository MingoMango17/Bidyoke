import { Disc3, Pause } from 'lucide-react'
import { playbackProgress } from '../lib/playbackProgress'
import { PlayerStatus, type PositionUpdate, type SessionState } from '../protocol'
import { Card } from './Layout'
import { SongThumb } from './SongRow'
import { EmptyState } from './ui/EmptyState'
import { ProgressBar } from './ui/ProgressBar'

export function NowPlaying({ state, position }: { state: SessionState; position?: PositionUpdate }) {
  const progress = playbackProgress(state, position)
  const item = state.nowPlaying
  const paused = state.player.status === PlayerStatus.Paused
  const adder = item && state.members.find((m) => m.memberId === item.addedBy)?.name

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-brand-soft to-surface">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand">Now playing</h2>
      {item ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <SongThumb src={item.song.thumbnail} className="size-24 shadow-md" />
            <div className="min-w-0 flex-1 self-center">
              <p className="line-clamp-2 font-display text-xl font-semibold leading-tight">{item.song.title}</p>
              {item.song.artist && <p className="truncate text-muted">{item.song.artist}</p>}
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                {paused ? <Pause className="size-3.5" aria-hidden /> : <Disc3 className="size-3.5 animate-spin [animation-duration:3s]" aria-hidden />}
                {paused ? 'Paused' : 'Playing'}
                {adder && ` · added by ${adder}`}
              </p>
            </div>
          </div>
          <ProgressBar positionMs={progress} durationMs={item.song.durationMs} showTimes />
        </div>
      ) : (
        <EmptyState icon={Disc3} title="Nothing is playing" body="Add a song to get the party started." />
      )}
    </Card>
  )
}
