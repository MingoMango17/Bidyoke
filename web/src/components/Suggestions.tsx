import type { Song } from '../protocol'
import { Card } from './Layout'
import { SongRow } from './SongRow'

interface Props {
  songs: Song[]
  canAdd: boolean
  onAdd: (song: Song) => void
}

export function Suggestions({ songs, canAdd, onAdd }: Props) {
  if (songs.length === 0) return null
  return (
    <Card title="Suggested">
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
  )
}
