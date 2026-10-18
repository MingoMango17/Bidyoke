import { useNavigate } from '@tanstack/react-router'
import { Role } from '../api/types'
import { useCreateSession } from '../api/sessions'
import { buttonClass, Card, ErrorText } from '../components/Layout'
import { JoinForm } from '../components/JoinForm'
import { saveIdentity, type Identity } from '../lib/identity'

export function Landing() {
  const navigate = useNavigate()
  const create = useCreateSession()

  function host() {
    create.mutate(undefined, {
      onSuccess: (res) => {
        saveIdentity({ code: res.code, memberId: res.memberId, token: res.token, role: Role.Host })
        void navigate({ to: '/host/$code', params: { code: res.code } })
      },
    })
  }

  function joined(identity: Identity) {
    saveIdentity(identity)
    void navigate({ to: '/s/$code', params: { code: identity.code } })
  }

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Bidyoke</h1>
        <p className="text-zinc-500">Party karaoke from your phone.</p>
      </header>
      <Card title="Host a session">
        <div className="flex flex-col gap-3">
          <ErrorText message={create.error?.message} />
          <button className={buttonClass} onClick={host} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Start a session'}
          </button>
        </div>
      </Card>
      <Card title="Join a session">
        <JoinForm onJoined={joined} />
      </Card>
    </>
  )
}
