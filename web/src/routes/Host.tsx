import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { Role } from '../api/types'
import { Card } from '../components/Layout'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { HostPlayer } from '../components/HostPlayer'
import { HostQueue } from '../components/HostQueue'
import { JoinCard } from '../components/JoinCard'
import { MemberList } from '../components/MemberList'
import { SessionClosed } from '../components/SessionClosed'
import { SessionFlashes } from '../components/SessionFlashes'
import { Suggestions } from '../components/Suggestions'
import { Command } from '../protocol'
import { loadIdentity } from '../lib/identity'
import { endedReason } from '../session/closed'
import { ConnectionStatus } from '../session/socket'
import { useSession } from '../session/useSession'

export function Host() {
  const { code } = useParams({ from: '/host/$code' })
  const [identity] = useState(() => loadIdentity(code))
  const isHost = identity?.role === Role.Host
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

  const over = endedReason(session.status, session.closeReason)
  if (over) return <SessionClosed reason={over} />

  const { state } = session
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Host · {code}</h1>
        <ConnectionBadge
          status={session.status}
          closeReason={session.closeReason}
          onReconnect={session.reconnect}
        />
      </header>
      <SessionFlashes session={session} />
      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <HostPlayer identity={identity} session={session} />
        <div className="flex flex-col gap-6">
          <JoinCard code={code} />
          {state && (
            <>
              <HostQueue state={state} send={session.send} />
              <Suggestions
                suggestions={state.suggestions}
                canAdd={session.status === ConnectionStatus.Open}
                onAdd={(song) => session.send(Command.QueueAdd, { songId: song.songId })}
              />
              <MemberList state={state} send={session.send} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
