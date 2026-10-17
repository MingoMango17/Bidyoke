import { useState, type FormEvent } from 'react'
import { useSongSearch } from '../api/songs'
import type { Song } from '../protocol'
import { buttonClass, Card, ErrorText, inputClass } from './Layout'
import { SongRow } from './SongRow'

interface Props {
  token: string
  sources: string[]
  queuedIds: ReadonlySet<string>
  canAdd: boolean
  onAdd: (song: Song) => void
}

const SOURCE_LABELS: Record<string, string> = { youtube: 'YouTube', local: 'Library' }

export function SongSearch({ token, sources, queuedIds, canAdd, onAdd }: Props) {
  const [source, setSource] = useState(sources[0] ?? 'youtube')
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const search = useSongSearch(token, query, source)

  function submit(event: FormEvent) {
    event.preventDefault()
    setQuery(input.trim())
  }

  return (
    <Card title="Add a song">
      <div className="flex flex-col gap-3">
        {sources.length > 1 && (
          <div className="flex gap-2" role="tablist">
            {sources.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={s === source}
                onClick={() => setSource(s)}
                className={`rounded-full px-3 py-1 text-sm ${
                  s === source
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {SOURCE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Song or artist"
            value={input}
            maxLength={100}
            onChange={(e) => setInput(e.target.value)}
            required
          />
          <button type="submit" className={`${buttonClass} !w-auto`} disabled={search.isFetching}>
            Search
          </button>
        </form>
        <ErrorText message={search.error?.message} />
        {search.isFetching && <p className="text-sm text-zinc-500">Searching…</p>}
        {search.data?.results.length === 0 && (
          <p className="text-sm text-zinc-500">No songs found.</p>
        )}
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {search.data?.results.map((song) => {
            const queued = queuedIds.has(song.songId)
            return (
              <SongRow
                key={song.songId}
                song={song}
                action={
                  <button
                    className="rounded-lg border border-violet-600 px-3 py-1 text-sm text-violet-600 disabled:opacity-40 dark:text-violet-400"
                    disabled={!canAdd || queued}
                    onClick={() => onAdd(song)}
                  >
                    {queued ? 'Queued' : 'Add'}
                  </button>
                }
              />
            )
          })}
        </ul>
      </div>
    </Card>
  )
}
