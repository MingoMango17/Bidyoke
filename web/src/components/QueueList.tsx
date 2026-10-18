import { PlayerStatus, type SessionState } from '../protocol'
import { Card } from './Layout'
import { SongRow } from './SongRow'

interface Props {
  state: SessionState
  memberId: string
  onRemove: (itemId: string) => void
}

export function QueueList({ state, memberId, onRemove }: Props) {
  const nameOf = (id: string) => state.members.find((m) => m.memberId === id)?.name ?? 'Someone'

  return (
    <>
      <Card title="Now playing">
        {state.nowPlaying ? (
          <ul>
            <SongRow
              song={state.nowPlaying.song}
              note={`${nameOf(state.nowPlaying.addedBy)}${state.player.status === PlayerStatus.Paused ? ' · paused' : ''}`}
            />
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Nothing is playing. Add a song to start.</p>
        )}
      </Card>
      <Card title={`Up next (${state.queue.length})`}>
        {state.queue.length === 0 ? (
          <p className="text-sm text-zinc-500">The queue is empty.</p>
        ) : (
          <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {state.queue.map((item) => (
              <SongRow
                key={item.itemId}
                song={item.song}
                note={nameOf(item.addedBy)}
                action={
                  item.addedBy === memberId && (
                    <button
                      className="text-sm text-red-600 dark:text-red-400"
                      onClick={() => onRemove(item.itemId)}
                    >
                      Remove
                    </button>
                  )
                }
              />
            ))}
          </ol>
        )}
      </Card>
    </>
  )
}
