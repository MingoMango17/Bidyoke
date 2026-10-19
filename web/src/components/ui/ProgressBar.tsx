import { formatDuration } from '../../lib/format'

interface Props {
  positionMs: number
  durationMs: number
  showTimes?: boolean
}

export function ProgressBar({ positionMs, durationMs, showTimes = false }: Props) {
  const percent = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label="Song progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
      </div>
      {showTimes && (
        <div className="flex justify-between text-xs tabular-nums text-muted">
          <span>{formatDuration(positionMs)}</span>
          <span>{formatDuration(durationMs)}</span>
        </div>
      )}
    </div>
  )
}
