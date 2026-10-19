import { Music } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { formatDuration } from '../lib/format'
import type { Song } from '../protocol'

export function SongThumb({ src, className = 'size-14' }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-brand ${className}`}>
        <Music className="size-1/2" aria-hidden />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-lg object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

interface Props {
  song: Song
  note?: string
  leading?: ReactNode
  action?: ReactNode
  rowProps?: ComponentProps<'li'>
}

export function SongRow({ song, note, leading, action, rowProps }: Props) {
  const { className = '', ...rest } = rowProps ?? {}
  return (
    <li className={`flex animate-fade-in items-center gap-3 py-2 ${className}`} {...rest}>
      {leading}
      <SongThumb src={song.thumbnail} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{song.title}</p>
        {song.artist && <p className="truncate text-sm text-muted">{song.artist}</p>}
        <p className="truncate text-xs text-muted">
          {[formatDuration(song.durationMs), note].filter(Boolean).join(' · ')}
        </p>
      </div>
      {action}
    </li>
  )
}
