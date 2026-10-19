import { Check, Plus, Search, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSongSearch } from '../api/songs'
import { loadRecentSearches, rememberSearch } from '../lib/recentSearches'
import { SongSource, type Song } from '../protocol'
import { Card, ErrorText, inputClass } from './Layout'
import { SongRow } from './SongRow'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'
import { SongRowSkeleton } from './ui/Skeleton'
import { Tabs } from './ui/Tabs'

interface Props {
  token: string
  sources: string[]
  queuedIds: ReadonlySet<string>
  canAdd: boolean
  disabledReason?: string
  onAdd: (song: Song) => void
}

const SOURCE_LABELS: Record<string, string> = { youtube: 'YouTube', local: 'Library' }
const DEBOUNCE_MS = 600
const MIN_CHARS = 3

export function SongSearch({ token, sources, queuedIds, canAdd, disabledReason, onAdd }: Props) {
  const [source, setSource] = useState(sources[0] ?? SongSource.YouTube)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState(loadRecentSearches)
  const search = useSongSearch(token, query, source)

  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length < MIN_CHARS) return
    const timer = setTimeout(() => setQuery(trimmed), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input])

  function run(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setInput(trimmed)
    setQuery(trimmed)
    setRecent(rememberSearch(trimmed))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    run(input)
  }

  function clear() {
    setInput('')
    setQuery('')
  }

  const showResults = query.length > 0 && input.trim().length > 0
  const results = showResults ? search.data?.results : undefined

  return (
    <Card title="Add a song">
      <div className="flex flex-col gap-4">
        {sources.length > 1 && (
          <Tabs
            idPrefix="source"
            label="Song source"
            tabs={sources.map((s) => ({ id: s, label: SOURCE_LABELS[s] ?? s }))}
            value={source}
            onChange={setSource}
          />
        )}
        <form onSubmit={submit} className="flex gap-2" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              className={`${inputClass} pl-9 pr-10`}
              type="search"
              aria-label="Song or artist"
              placeholder="Song or artist"
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
            />
            {input && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clear}
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={!input.trim() || search.isFetching}>
            Search
          </Button>
        </form>
        {!input && recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Recent</span>
            {recent.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => run(q)}
                className="min-h-8 rounded-full bg-surface-2 px-3 text-sm hover:bg-brand-soft"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <ErrorText message={showResults ? search.error?.message : undefined} />
        {showResults && search.isFetching && (
          <ul aria-label="Searching">
            <SongRowSkeleton />
            <SongRowSkeleton />
            <SongRowSkeleton />
          </ul>
        )}
        {!search.isFetching && results?.length === 0 && (
          <EmptyState icon={Search} title="No songs found" body="Try a different title or artist." />
        )}
        {!search.isFetching && results && results.length > 0 && (
          <ul className="divide-y divide-line">
            {results.map((song) => {
              const queued = queuedIds.has(song.songId)
              return (
                <SongRow
                  key={song.songId}
                  song={song}
                  action={
                    <Button
                      variant={queued ? 'ghost' : 'secondary'}
                      size="sm"
                      disabled={!canAdd || queued}
                      title={!canAdd && !queued ? disabledReason : undefined}
                      aria-label={`${queued ? 'Queued' : 'Add'} ${song.title}`}
                      onClick={() => onAdd(song)}
                    >
                      {queued ? <Check className="size-4" /> : <Plus className="size-4" />}
                      {queued ? 'Queued' : 'Add'}
                    </Button>
                  }
                />
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
