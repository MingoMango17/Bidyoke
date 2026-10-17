import { Link, useParams } from '@tanstack/react-router'
import { Card } from '../components/Layout'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { loadIdentity } from '../lib/identity'
import { useSession } from '../session/useSession'

export function Host() {
  const { code } = useParams({ from: '/host/$code' })
  const identity = loadIdentity(code)
  const isHost = identity?.role === 'host'
  const session = useSession(isHost ? identity : undefined)

  if (!isHost) {
    return (
      <Card title="Not your session">
        <p className="mb-3">You are not the host of session {code}.</p>
        <Link to="/" className="text-violet-600 underline">
          Back to start
        </Link>
      </Card>
    )
  }

  return (
    <Card title="Host screen">
      <p className="text-sm text-zinc-500">Session code</p>
      <p className="text-5xl font-bold tracking-widest">{code}</p>
      <div className="mt-4 flex flex-col gap-2">
        <ConnectionBadge
          status={session.status}
          closeReason={session.closeReason}
          onReconnect={session.reconnect}
        />
        <ul className="text-sm">
          {session.state?.members.map((m) => (
            <li key={m.memberId} className={m.connected ? '' : 'text-zinc-400'}>
              {m.name} ({m.role})
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
