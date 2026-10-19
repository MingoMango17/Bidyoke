import { Link } from '@tanstack/react-router'
import { CloseReason } from '../session/socket'
import type { EndReason } from '../session/closed'
import { buttonClass, Card } from './Layout'

const TEXT: Record<EndReason, { title: string; body: string }> = {
  [CloseReason.Ended]: { title: 'Session ended', body: 'This session has ended.' },
  [CloseReason.Kicked]: {
    title: 'Removed from the session',
    body: 'The host removed you from this session.',
  },
  [CloseReason.InvalidToken]: {
    title: 'Session expired',
    body: 'Your access to this session is no longer valid. Join again from the start page.',
  },
}

export function SessionClosed({ reason }: { reason: EndReason }) {
  const { title, body } = TEXT[reason]
  return (
    <Card title={title}>
      <p className="mb-4">{body}</p>
      <Link to="/" className={`${buttonClass} block text-center`}>
        Back to start
      </Link>
    </Card>
  )
}
