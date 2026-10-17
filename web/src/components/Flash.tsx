import { useEffect, useState } from 'react'

interface Props {
  item: object | undefined
  message: string | undefined
  tone: 'error' | 'info'
}

const VISIBLE_MS = 6000

export function Flash({ item, message, tone }: Props) {
  const [hidden, setHidden] = useState<object>()

  useEffect(() => {
    if (!item) return
    const timer = setTimeout(() => setHidden(item), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [item])

  if (!item || !message || hidden === item) return null
  const color =
    tone === 'error'
      ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
      : 'border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${color}`}
    >
      <span>{message}</span>
      <button aria-label="Dismiss" className="opacity-60" onClick={() => setHidden(item)}>
        ×
      </button>
    </p>
  )
}
