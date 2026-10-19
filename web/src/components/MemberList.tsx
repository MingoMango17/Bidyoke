import { Crown, Lock, LockOpen, LogOut, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { Role } from '../api/types'
import { Command, type SessionState } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'

interface Props {
  state: SessionState
  send: SessionApi['send']
}

export function MemberList({ state, send }: Props) {
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
            </span>
            {m.role !== Role.Host && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Kick ${m.name}`}
                onClick={() => send(Command.SessionKick, { memberId: m.memberId })}
              >
                <UserMinus className="size-4 text-danger" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="secondary" size="sm" onClick={() => send(Command.SessionLock, { locked: !locked })}>
          {locked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
          {locked ? 'Unlock joining' : 'Lock joining'}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setConfirmingEnd(true)}>
          <LogOut className="size-4" />
          End session
        </Button>
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
