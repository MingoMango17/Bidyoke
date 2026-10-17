import type { SessionState } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { Card } from './Layout'
import { SongRow } from './SongRow'

interface Props {
  state: SessionState
  send: SessionApi['send']
}

const smallButton = 'rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-30 dark:border-zinc-700'

export function HostQueue({ state, send }: Props) {
  const nameOf = (id: string) => state.members.find((m) => m.memberId === id)?.name ?? 'Someone'
  const last = state.queue.length - 1

  return (
    <Card title={`Up next (${state.queue.length})`}>
      {state.queue.length === 0 ? (
        <p className="text-sm text-zinc-500">The queue is empty.</p>
      ) : (
        <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {state.queue.map((item, index) => (
            <SongRow
              key={item.itemId}
              song={item.song}
              note={nameOf(item.addedBy)}
              action={
                <div className="flex gap-1">
                  <button
                    aria-label="Move up"
                    className={smallButton}
                    disabled={index === 0}
                    onClick={() => send('queue.move', { itemId: item.itemId, toIndex: index - 1 })}
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Move down"
                    className={smallButton}
                    disabled={index === last}
                    onClick={() => send('queue.move', { itemId: item.itemId, toIndex: index + 1 })}
                  >
                    ↓
                  </button>
                  <button
                    aria-label="Remove"
                    className={`${smallButton} text-red-600 dark:text-red-400`}
                    onClick={() => send('queue.remove', { itemId: item.itemId })}
                  >
                    ×
                  </button>
                </div>
              }
            />
          ))}
        </ol>
      )}
    </Card>
  )
}
