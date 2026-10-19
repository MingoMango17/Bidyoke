import { ListMusic, Trash2 } from 'lucide-react'
import type { SessionState } from '../protocol'
import { Card } from './Layout'
import { NowPlaying } from './NowPlaying'
import { SongRow } from './SongRow'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'

interface Props {
  state: SessionState
  memberId: string
  onRemove: (itemId: string) => void
}

export function QueueList({ state, memberId, onRemove }: Props) {
  const nameOf = (id: string) => state.members.find((m) => m.memberId === id)?.name ?? 'Someone'

  return (
    <>
      <NowPlaying state={state} />
      <Card title={`Up next (${state.queue.length})`}>
        {state.queue.length === 0 ? (
          <EmptyState icon={ListMusic} title="The queue is empty" body="Search for a song or pick a suggestion." />
        ) : (
          <ol className="divide-y divide-line">
            {state.queue.map((item) => (
              <SongRow
                key={item.itemId}
                song={item.song}
                note={nameOf(item.addedBy)}
                action={
                  item.addedBy === memberId && (
                    <Button variant="ghost" size="icon" aria-label={`Remove ${item.song.title}`} onClick={() => onRemove(item.itemId)}>
                      <Trash2 className="size-4" />
                    </Button>
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
