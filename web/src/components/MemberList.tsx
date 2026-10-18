import { Role } from '../api/types'
import { Command, type SessionState } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { Card } from './Layout'

interface Props {
  state: SessionState
  send: SessionApi['send']
}

export function MemberList({ state, send }: Props) {
  const { locked } = state.settings

  function end() {
    if (window.confirm('End the session for everyone?')) send(Command.SessionEnd)
  }

  return (
    <Card title={`People (${state.members.length})`}>
      <ul className="flex flex-col gap-1 text-sm">
        {state.members.map((m) => (
          <li key={m.memberId} className="flex items-center justify-between gap-2">
            <span className={m.connected ? '' : 'text-zinc-400'}>
              {m.name}
              {m.role === Role.Host && ' (host)'}
            </span>
            {m.role !== Role.Host && (
              <button
                className="text-red-600 dark:text-red-400"
                onClick={() => send(Command.SessionKick, { memberId: m.memberId })}
              >
                Kick
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2 text-sm">
        <button
          className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700"
          onClick={() => send(Command.SessionLock, { locked: !locked })}
        >
          {locked ? 'Unlock joining' : 'Lock joining'}
        </button>
        <button className="rounded border border-red-400 px-3 py-1 text-red-600" onClick={end}>
          End session
        </button>
      </div>
    </Card>
  )
}
