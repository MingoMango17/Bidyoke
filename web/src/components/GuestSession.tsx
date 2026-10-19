import { ListMusic, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useConfig } from '../api/songs'
import { Command } from '../protocol'
import type { Identity } from '../lib/identity'
import { endedReason } from '../session/closed'
import { ConnectionStatus } from '../session/socket'
import type { SessionApi } from '../session/useSession'
import { ConnectionBadge } from './ConnectionBadge'
import { Card } from './Layout'
import { MiniPlayer } from './MiniPlayer'
import { QueueList } from './QueueList'
import { SessionClosed } from './SessionClosed'
import { SessionFlashes } from './SessionFlashes'
import { SongSearch } from './SongSearch'
import { Suggestions } from './Suggestions'
import { Skeleton, SongRowSkeleton } from './ui/Skeleton'
import { panelId, tabId } from './ui/tabIds'
import { Tabs } from './ui/Tabs'

interface Props {
  identity: Identity
  session: SessionApi
}

type Tab = 'queue' | 'add' | 'suggestions'

const PREFIX = 'guest'

export function GuestSession({ identity, session }: Props) {
  const config = useConfig()
  const [tab, setTab] = useState<Tab>('queue')
  const { state } = session
  const mine = state?.queue.filter((item) => item.addedBy === identity.memberId) ?? []
  const atCap = state !== undefined && mine.length >= state.settings.maxQueuePerMember
  const queuedIds = new Set(mine.map((item) => item.song.songId))
  const canAdd = session.status === ConnectionStatus.Open && !atCap
  const capText = atCap
    ? `You have ${mine.length} of ${state.settings.maxQueuePerMember} songs queued. Remove one or wait for yours to play.`
    : undefined
  const disabledReason = capText ?? 'Reconnecting…'

  const over = endedReason(session.status, session.closeReason)
  if (over) return <SessionClosed reason={over} />

  const add = (songId: string) => session.send(Command.QueueAdd, { songId })

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">
          Session <span className="tracking-widest">{identity.code}</span>
        </h1>
        <ConnectionBadge
          status={session.status}
          closeReason={session.closeReason}
          onReconnect={session.reconnect}
        />
      </header>
      <SessionFlashes session={session} />
      {state ? (
        <div
          role="tabpanel"
          id={panelId(PREFIX, tab)}
          aria-labelledby={tabId(PREFIX, tab)}
          className="flex flex-col gap-5 pb-32"
        >
          {tab !== 'queue' && capText && (
            <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm font-medium text-warn">
              {capText}
            </p>
          )}
          {tab === 'queue' && (
            <QueueList
              state={state}
              memberId={identity.memberId}
              onRemove={(itemId) => session.send(Command.QueueRemove, { itemId })}
            />
          )}
          {tab === 'add' &&
            (config.data ? (
              <SongSearch
                token={identity.token}
                sources={config.data.sources}
                queuedIds={queuedIds}
                canAdd={canAdd}
                disabledReason={disabledReason}
                onAdd={(song) => add(song.songId)}
              />
            ) : (
              <Card title="Add a song">
                <ul>
                  <SongRowSkeleton />
                  <SongRowSkeleton />
                </ul>
              </Card>
            ))}
          {tab === 'suggestions' && (
            <Suggestions
              suggestions={state.suggestions}
              canAdd={canAdd}
              disabledReason={disabledReason}
              onAdd={(song) => add(song.songId)}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5" aria-busy aria-label="Loading session">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}
      {state && (
        <nav
          aria-label="Session"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <div className="mx-auto max-w-md">
            {tab !== 'queue' && <MiniPlayer state={state} />}
            <Tabs<Tab>
              variant="bar"
              idPrefix={PREFIX}
              label="Session sections"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'queue', label: 'Queue', icon: <ListMusic className="size-5" /> },
                { id: 'add', label: 'Add', icon: <Plus className="size-5" /> },
                { id: 'suggestions', label: 'Suggestions', icon: <Sparkles className="size-5" /> },
              ]}
            />
          </div>
        </nav>
      )}
    </>
  )
}
