import { useState, type FormEvent } from 'react'
import { normalizeCode, useJoinSession } from '../api/sessions'
import { Role } from '../api/types'
import type { Identity } from '../lib/identity'
import { buttonClass, ErrorText, inputClass } from './Layout'

interface Props {
  fixedCode?: string
  onJoined: (identity: Identity) => void
}

export function JoinForm({ fixedCode, onJoined }: Props) {
  const [code, setCode] = useState(fixedCode ?? '')
  const [name, setName] = useState('')
  const join = useJoinSession()

  function submit(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeCode(code)
    join.mutate(
      { code: normalized, name },
      {
        onSuccess: (res) =>
          onJoined({ code: normalized, memberId: res.memberId, token: res.token, role: Role.Guest }),
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {fixedCode === undefined && (
        <input
          className={`${inputClass} uppercase tracking-widest`}
          placeholder="Session code"
          value={code}
          maxLength={5}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => setCode(e.target.value)}
          required
        />
      )}
      <input
        className={inputClass}
        placeholder="Your name"
        value={name}
        maxLength={24}
        autoComplete="nickname"
        onChange={(e) => setName(e.target.value)}
        required
      />
      <ErrorText message={join.error?.message} />
      <button type="submit" className={buttonClass} disabled={join.isPending}>
        {join.isPending ? 'Joining…' : 'Join'}
      </button>
    </form>
  )
}
