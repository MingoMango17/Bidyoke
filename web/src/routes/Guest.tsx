import { Link, useParams } from '@tanstack/react-router'
import { Lock, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRejoin, useSessionInfo } from '../api/sessions'
import { Card } from '../components/Layout'
import { GuestSession } from '../components/GuestSession'
import { JoinForm } from '../components/JoinForm'
import { buttonStyles } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
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
        <div role="status" aria-label="Reconnecting" className="flex flex-col gap-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    )
  }

  if (identity && !rejoin.isError) {
    return <GuestSession identity={identity} session={session} />
  }

  if (info.isError) {
    return (
      <Card className="my-auto">
        <EmptyState icon={SearchX} title="Cannot join" body={info.error.message} />
        <Link to="/" className={`${buttonStyles({ block: true })} mt-2`}>
          Back to start
        </Link>
      </Card>
    )
  }

  return (
    <Card title={`Join session ${code}`}>
      {info.data?.locked ? (
        <EmptyState icon={Lock} title="Not accepting new members" body="Ask the host to unlock joining." />
      ) : (
        <JoinForm fixedCode={code} onJoined={joined} />
      )}
    </Card>
  )
}
