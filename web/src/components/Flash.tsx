import { AlertCircle, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  item: object | undefined
  message: string | undefined
  tone: 'error' | 'info'
}

const VISIBLE_MS = 6000

export function Flash({ item, message, tone }: Props) {
  const [hidden, setHidden] = useState<object>()
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!item || paused) return
    const timer = setTimeout(() => setHidden(item), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [item, paused])

  if (!item || !message || hidden === item) return null
  const error = tone === 'error'
  const Icon = error ? AlertCircle : Info
  return (
    <div
      role={error ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex w-full max-w-md animate-toast-in items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
        error ? 'border-danger/40 bg-danger-soft text-danger' : 'border-line bg-surface text-fg'
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      <button aria-label="Dismiss" className="-m-2 grid size-9 place-items-center rounded-lg opacity-70 hover:opacity-100" onClick={() => setHidden(item)}>
        <X className="size-4" />
      </button>
    </div>
  )
}
