import { groupSuggestions, SUGGESTION_TITLES } from '../lib/suggestions'
import type { Song, Suggestion } from '../protocol'
import { Card } from './Layout'
import { SongRow } from './SongRow'

interface Props {
  suggestions: Suggestion[]
  canAdd: boolean
  onAdd: (song: Song) => void
}

export function Suggestions({ suggestions, canAdd, onAdd }: Props) {
  return (
    <>
      {groupSuggestions(suggestions).map(({ reason, songs }) => (
        <Card key={reason} title={SUGGESTION_TITLES[reason]}>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {songs.map((song) => (
              <SongRow
                key={song.songId}
                song={song}
                action={
                  <button
                    className="rounded-lg border border-violet-600 px-3 py-1 text-sm text-violet-600 disabled:opacity-40 dark:text-violet-400"
                    disabled={!canAdd}
                    onClick={() => onAdd(song)}
                  >
                    Add
                  </button>
                }
              />
            ))}
          </ul>
        </Card>
      ))}
    </>
  )
}
