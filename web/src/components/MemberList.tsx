import { Crown, Lock, LockOpen, LogOut, ShieldCheck, ShieldOff, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { Role } from '../api/types'
import { Command, type SessionState } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { QueueLimit } from './QueueLimit'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'

interface Props {
  state: SessionState
  send: SessionApi['send']
  viewerRole: Role
}

export function MemberList({ state, send, viewerRole }: Props) {
  const isHost = viewerRole === Role.Host
  const { locked } = state.settings
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line">
        {state.members.map((m) => (
          <li key={m.memberId} className="flex items-center justify-between gap-2 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`size-2 shrink-0 rounded-full ${m.connected ? 'bg-success' : 'bg-muted/40'}`}
                role="img"
                aria-label={m.connected ? 'Online' : 'Offline'}
              />
              <span className={`truncate ${m.connected ? '' : 'text-muted'}`}>{m.name}</span>
              {m.role === Role.Host && <Crown className="size-4 shrink-0 text-brand" aria-label="Host" />}
              {m.role === Role.Subhost && <ShieldCheck className="size-4 shrink-0 text-brand" aria-label="Subhost" />}
            </span>
            <span className="flex shrink-0">
              {m.role === Role.Guest && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Make ${m.name} a subhost`}
                  onClick={() => send(Command.SessionPromote, { memberId: m.memberId })}
                >
                  <ShieldCheck className="size-4" />
                </Button>
              )}
              {m.role === Role.Subhost && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove subhost from ${m.name}`}
                  onClick={() => send(Command.SessionDemote, { memberId: m.memberId })}
                >
                  <ShieldOff className="size-4" />
                </Button>
              )}
              {m.role !== Role.Host && (isHost || m.role === Role.Guest) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Kick ${m.name}`}
                  onClick={() => send(Command.SessionKick, { memberId: m.memberId })}
                >
                  <UserMinus className="size-4 text-danger" />
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4 border-t border-line pt-4">
        <QueueLimit limit={state.settings.maxQueuePerMember} send={send} />
        {isHost && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => send(Command.SessionLock, { locked: !locked })}>
              {locked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
              {locked ? 'Unlock joining' : 'Lock joining'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmingEnd(true)}>
              <LogOut className="size-4" />
              End session
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmingEnd}
        title="End the session?"
        body="Everyone is disconnected. This can't be undone."
        confirmLabel="End session"
        onConfirm={() => send(Command.SessionEnd)}
        onCancel={() => setConfirmingEnd(false)}
      />
    </div>
  )
}
