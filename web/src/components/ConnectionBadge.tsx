import { CloseReason, ConnectionStatus } from '../session/socket'

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
      <div className="flex flex-col gap-2 text-sm text-red-600 dark:text-red-400">
        <p role="alert">{CLOSED_TEXT[closeReason]}</p>
        {closeReason === CloseReason.Replaced && (
          <button className="self-start underline" onClick={onReconnect}>
            Use this tab instead
          </button>
        )}
      </div>
    )
  }
  const connected = status === ConnectionStatus.Open
  return (
    <p className="flex items-center gap-2 text-sm text-zinc-500">
      <span
        className={`size-2 rounded-full ${connected ? 'bg-green-500' : 'animate-pulse bg-amber-500'}`}
      />
      {connected ? 'Connected' : status === ConnectionStatus.Connecting ? 'Connecting…' : 'Reconnecting…'}
    </p>
  )
}
