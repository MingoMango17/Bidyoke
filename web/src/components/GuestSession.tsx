import { useConfig } from '../api/songs'
import { noticeText } from '../lib/notices'
import type { Identity } from '../lib/identity'
import type { SessionApi } from '../session/useSession'
import { ConnectionBadge } from './ConnectionBadge'
import { Flash } from './Flash'
import { QueueList } from './QueueList'
import { SongSearch } from './SongSearch'

interface Props {
  identity: Identity
  session: SessionApi
}

export function GuestSession({ identity, session }: Props) {
  const config = useConfig()
  const { state } = session
  const mine = state?.queue.filter((item) => item.addedBy === identity.memberId) ?? []
  const atCap = state !== undefined && mine.length >= state.settings.maxQueuePerMember
  const queuedIds = new Set(mine.map((item) => item.song.songId))

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Session {identity.code}</h1>
        <ConnectionBadge
          status={session.status}
          closeReason={session.closeReason}
          onReconnect={session.reconnect}
        />
      </header>
      <Flash item={session.lastError} message={session.lastError?.message} tone="error" />
      <Flash
        item={session.lastNotice}
        message={session.lastNotice && noticeText(session.lastNotice)}
        tone="info"
      />
      {state ? (
        <>
          <QueueList
            state={state}
            memberId={identity.memberId}
            onRemove={(itemId) => session.send('queue.remove', { itemId })}
          />
          {config.data && (
            <SongSearch
              token={identity.token}
              sources={config.data.sources}
              queuedIds={queuedIds}
              canAdd={session.status === 'open' && !atCap}
              onAdd={(song) => session.send('queue.add', { songId: song.songId })}
            />
          )}
          {atCap && (
            <p className="text-sm text-zinc-500">
              You have {mine.length} of {state.settings.maxQueuePerMember} songs queued. Remove one
              or wait for yours to play.
            </p>
          )}
        </>
      ) : (
        <p className="text-zinc-500">Loading session…</p>
      )}
    </>
  )
}
