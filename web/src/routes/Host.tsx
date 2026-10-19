import { Link, useParams } from '@tanstack/react-router'
import { ListMusic, Sparkles, Users, ShieldQuestion } from 'lucide-react'
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
import { buttonStyles } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { panelId, tabId } from '../components/ui/tabIds'
import { Tabs } from '../components/ui/Tabs'
import { Command } from '../protocol'
import { loadIdentity } from '../lib/identity'
import { endedReason } from '../session/closed'
import { ConnectionStatus } from '../session/socket'
import { useSession } from '../session/useSession'

type Tab = 'queue' | 'suggestions' | 'people'

const PREFIX = 'host'

export function Host() {
  const { code } = useParams({ from: '/host/$code' })
  const [identity] = useState(() => loadIdentity(code))
  const [tab, setTab] = useState<Tab>('queue')
  const isHost = identity?.role === Role.Host
  const session = useSession(isHost ? identity : undefined)

  if (!isHost) {
    return (
      <Card className="my-auto">
        <EmptyState icon={ShieldQuestion} title="Not your session" body={`You are not the host of session ${code}.`} />
        <Link to="/" className={`${buttonStyles({ block: true })} mt-2`}>
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
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">
          Host <span className="text-muted">·</span> <span className="tracking-widest">{code}</span>
        </h1>
        <ConnectionBadge
          status={session.status}
          closeReason={session.closeReason}
          onReconnect={session.reconnect}
        />
      </header>
      <SessionFlashes session={session} />
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <HostPlayer identity={identity} session={session} />
          <JoinCard code={code} />
        </div>
        <Card className="lg:sticky lg:top-4">
          {state ? (
            <div className="flex flex-col gap-4">
              <Tabs<Tab>
                idPrefix={PREFIX}
                label="Host panels"
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'queue', label: 'Queue', icon: <ListMusic className="size-4" />, badge: state.queue.length },
                  { id: 'suggestions', label: 'Suggest', icon: <Sparkles className="size-4" /> },
                  { id: 'people', label: 'People', icon: <Users className="size-4" />, badge: state.members.length },
                ]}
              />
              <div role="tabpanel" id={panelId(PREFIX, tab)} aria-labelledby={tabId(PREFIX, tab)} className="flex flex-col gap-4">
                {tab === 'queue' && <HostQueue state={state} send={session.send} />}
                {tab === 'suggestions' && (
                  <Suggestions
                    suggestions={state.suggestions}
                    canAdd={session.status === ConnectionStatus.Open}
                    disabledReason="Reconnecting…"
                    onAdd={(song) => session.send(Command.QueueAdd, { songId: song.songId })}
                  />
                )}
                {tab === 'people' && <MemberList state={state} send={session.send} />}
              </div>
            </div>
          ) : (
            <div aria-busy aria-label="Loading session" className="flex flex-col gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
