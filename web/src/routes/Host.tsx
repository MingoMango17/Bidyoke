import { Link, useParams } from '@tanstack/react-router'
import { Card } from '../components/Layout'
import { loadIdentity } from '../lib/identity'

export function Host() {
  const { code } = useParams({ from: '/host/$code' })
  const identity = loadIdentity(code)

  if (identity?.role !== 'host') {
    return (
      <Card title="Not your session">
        <p className="mb-3">You are not the host of session {code}.</p>
        <Link to="/" className="text-violet-600 underline">
          Back to start
        </Link>
      </Card>
    )
  }

  return (
    <Card title="Host screen">
      <p className="text-sm text-zinc-500">Session code</p>
      <p className="text-5xl font-bold tracking-widest">{code}</p>
    </Card>
  )
}
