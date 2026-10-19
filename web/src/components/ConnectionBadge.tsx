import { Wifi, WifiOff } from 'lucide-react'
import { CloseReason, ConnectionStatus } from '../session/socket'
import { Button } from './ui/Button'

interface Props {
  status: ConnectionStatus
  closeReason: CloseReason | undefined
  onReconnect: () => void
}

const CLOSED_TEXT: Record<CloseReason, string> = {
  [CloseReason.InvalidToken]: 'Your session expired. Rejoin from the start page.',
  [CloseReason.Ended]: 'This session has ended.',
  [CloseReason.Kicked]: 'You were removed from this session.',
  [CloseReason.Replaced]: 'This session is open in another tab.',
}

export function ConnectionBadge({ status, closeReason, onReconnect }: Props) {
  if (status === ConnectionStatus.Closed && closeReason) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
        <WifiOff className="size-4 shrink-0" aria-hidden />
        <p role="alert" className="flex-1">
          {CLOSED_TEXT[closeReason]}
        </p>
        {closeReason === CloseReason.Replaced && (
          <Button size="sm" variant="danger" onClick={onReconnect}>
            Use this tab instead
          </Button>
        )}
      </div>
    )
  }
  if (status === ConnectionStatus.Open) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="size-2 rounded-full bg-success" aria-hidden />
        Connected
      </p>
    )
  }
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2 text-sm font-medium text-warn"
    >
      <Wifi className="size-4 animate-pulse" aria-hidden />
      {status === ConnectionStatus.Connecting ? 'Connecting…' : 'Connection lost. Reconnecting…'}
    </p>
  )
}
