import { Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useRejoin, useSessionInfo } from '../api/sessions'
import { Card } from '../components/Layout'
import { GuestSession } from '../components/GuestSession'
import { JoinForm } from '../components/JoinForm'
import { clearIdentity, loadIdentity, saveIdentity, type Identity } from '../lib/identity'
import { useSession } from '../session/useSession'

export function Guest() {
  const { code } = useParams({ from: '/s/$code' })
  const [identity, setIdentity] = useState(() => loadIdentity(code))
  const rejoin = useRejoin(code, identity?.token)
  const info = useSessionInfo(code)
  const session = useSession(rejoin.isSuccess ? identity : undefined)

  function joined(next: Identity) {
    saveIdentity(next)
    setIdentity(next)
  }

  useEffect(() => {
    if (rejoin.isError) clearIdentity(code)
  }, [rejoin.isError, code])

  if (identity && rejoin.isPending) {
    return (
      <Card title={`Session ${code}`}>
        <p>Reconnecting…</p>
      </Card>
    )
  }

  if (identity && !rejoin.isError) {
    return <GuestSession identity={identity} session={session} />
  }

  if (info.isError) {
    return (
      <Card title="Cannot join">
        <p className="mb-3">{info.error.message}</p>
        <Link to="/" className="text-violet-600 underline">
          Back to start
        </Link>
      </Card>
    )
  }

  return (
    <Card title={`Join session ${code}`}>
      {info.data?.locked ? (
        <p>This session is not accepting new members.</p>
      ) : (
        <JoinForm fixedCode={code} onJoined={joined} />
      )}
    </Card>
  )
}
