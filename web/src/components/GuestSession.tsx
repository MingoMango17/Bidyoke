import { useConfig } from '../api/songs'
import { Command } from '../protocol'
import type { Identity } from '../lib/identity'
import { ConnectionStatus } from '../session/socket'
import type { SessionApi } from '../session/useSession'
import { ConnectionBadge } from './ConnectionBadge'
import { QueueList } from './QueueList'
import { SessionFlashes } from './SessionFlashes'
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
      <SessionFlashes session={session} />
      {state ? (
        <>
          <QueueList
            state={state}
            memberId={identity.memberId}
            onRemove={(itemId) => session.send(Command.QueueRemove, { itemId })}
          />
          {config.data && (
            <SongSearch
              token={identity.token}
              sources={config.data.sources}
              queuedIds={queuedIds}
              canAdd={session.status === ConnectionStatus.Open && !atCap}
              onAdd={(song) => session.send(Command.QueueAdd, { songId: song.songId })}
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
