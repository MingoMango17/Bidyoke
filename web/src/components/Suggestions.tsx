import { Plus, Sparkles } from 'lucide-react'
import { groupSuggestions } from '../lib/suggestions'
import type { Song, Suggestion } from '../protocol'
import { Card } from './Layout'
import { SongRow } from './SongRow'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'

interface Props {
  suggestions: Suggestion[]
  canAdd: boolean
  disabledReason?: string
  onAdd: (song: Song) => void
}

export function Suggestions({ suggestions, canAdd, disabledReason, onAdd }: Props) {
  const groups = groupSuggestions(suggestions)
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No suggestions yet"
        body="Songs played here and more from the same channel will show up once something plays."
      />
    )
  }
  return (
    <>
      {groups.map(({ reason, title, songs }) => (
        <Card key={reason} title={title}>
          <ul className="divide-y divide-line">
            {songs.map((song) => (
              <SongRow
                key={song.songId}
                song={song}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canAdd}
                    title={canAdd ? undefined : disabledReason}
                    aria-label={`Add ${song.title}`}
                    onClick={() => onAdd(song)}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                }
              />
            ))}
          </ul>
        </Card>
      ))}
    </>
  )
}
