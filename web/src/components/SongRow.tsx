import type { ReactNode } from 'react'
import { formatDuration } from '../lib/format'
import type { Song } from '../protocol'

interface Props {
  song: Song
  note?: string
  action?: ReactNode
}

export function SongRow({ song, note, action }: Props) {
  return (
    <li className="flex items-center gap-3 py-2">
      {song.thumbnail && (
        <img
          src={song.thumbnail}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{song.title}</p>
        <p className="truncate text-sm text-zinc-500">
          {[song.artist, formatDuration(song.durationMs), note].filter(Boolean).join(' · ')}
        </p>
      </div>
      {action}
    </li>
  )
}
