import { useNavigate } from '@tanstack/react-router'
import { Mic, Smartphone, Users } from 'lucide-react'
import { Role } from '../api/types'
import { useCreateSession } from '../api/sessions'
import { Card, ErrorText } from '../components/Layout'
import { LogoMark } from '../components/Logo'
import { JoinForm } from '../components/JoinForm'
import { Button } from '../components/ui/Button'
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
      <header className="relative flex flex-col items-center gap-4 pb-2 pt-6 text-center">
        <div aria-hidden className="absolute -top-8 left-1/2 -z-10 size-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 blur-3xl" />
        <LogoMark className="size-20 rounded-3xl" />
        <div>
          <h1 className="font-display text-5xl font-bold tracking-tight">Bidyoke</h1>
          <p className="mt-2 text-lg text-muted">Party karaoke from your phone.</p>
        </div>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted">
          <li className="flex items-center gap-1.5">
            <Smartphone className="size-4" aria-hidden /> Queue from any phone
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="size-4" aria-hidden /> Everyone shares one queue
          </li>
        </ul>
      </header>
      <Card>
        <div className="flex flex-col gap-3">
          <ErrorText message={create.error?.message} />
          <Button size="lg" block onClick={host} disabled={create.isPending}>
            <Mic className="size-5" />
            {create.isPending ? 'Creating…' : 'Start a session'}
          </Button>
          <p className="text-center text-sm text-muted">Hosting? Open this on the screen everyone can see.</p>
        </div>
      </Card>
      <div className="flex items-center gap-3 text-sm text-muted" role="separator">
        <span className="h-px flex-1 bg-line" />
        or join with a code
        <span className="h-px flex-1 bg-line" />
      </div>
      <Card>
        <JoinForm onJoined={joined} />
      </Card>
    </>
  )
}
