import { Minus, Plus } from 'lucide-react'
import { Command } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { Button } from './ui/Button'

interface Props {
  limit: number | null
  send: SessionApi['send']
}

export function QueueLimit({ limit, send }: Props) {
  const set = (maxQueuePerMember: number | null) => send(Command.SessionLimit, { maxQueuePerMember })

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-medium">Songs per person</span>
      <div className="flex items-center gap-2">
        {limit !== null && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fewer songs per person"
              disabled={limit <= 1}
              onClick={() => set(limit - 1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-6 text-center tabular-nums" aria-live="polite">
              {limit}
            </span>
            <Button variant="ghost" size="icon" aria-label="More songs per person" onClick={() => set(limit + 1)}>
              <Plus className="size-4" />
            </Button>
          </>
        )}
        <Button variant="secondary" size="sm" aria-pressed={limit === null} onClick={() => set(limit === null ? 3 : null)}>
          Unlimited
        </Button>
      </div>
    </div>
  )
}
