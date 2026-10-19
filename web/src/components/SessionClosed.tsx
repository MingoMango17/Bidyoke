import { Link } from '@tanstack/react-router'
import { PartyPopper, ShieldOff, TimerOff } from 'lucide-react'
import { CloseReason } from '../session/socket'
import type { EndReason } from '../session/closed'
import { Card } from './Layout'
import { buttonStyles } from './ui/buttonStyles'
import { EmptyState } from './ui/EmptyState'

const TEXT: Record<EndReason, { title: string; body: string; icon: typeof PartyPopper }> = {
  [CloseReason.Ended]: { title: 'Session ended', body: 'This session has ended. Thanks for singing!', icon: PartyPopper },
  [CloseReason.Kicked]: {
    title: 'Removed from the session',
    body: 'The host removed you from this session.',
    icon: ShieldOff,
  },
  [CloseReason.InvalidToken]: {
    title: 'Session expired',
    body: 'Your access to this session is no longer valid. Join again from the start page.',
    icon: TimerOff,
  },
}

export function SessionClosed({ reason }: { reason: EndReason }) {
  const { title, body, icon } = TEXT[reason]
  return (
    <Card className="my-auto">
      <EmptyState icon={icon} title={title} body={body} />
      <Link to="/" className={`${buttonStyles({ block: true })} mt-2`}>
        Back to start
      </Link>
    </Card>
  )
}
