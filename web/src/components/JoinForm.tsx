import { useState, type FormEvent } from 'react'
import { normalizeCode, useJoinSession } from '../api/sessions'
import { Role } from '../api/types'
import type { Identity } from '../lib/identity'
import { readStored, writeStored } from '../lib/storage'
import { ErrorText, Field, inputClass } from './Layout'
import { Button } from './ui/Button'

interface Props {
  fixedCode?: string
  onJoined: (identity: Identity) => void
}

const NAME_KEY = 'bidyoke:name'

export function JoinForm({ fixedCode, onJoined }: Props) {
  const [code, setCode] = useState(fixedCode ?? '')
  const [name, setName] = useState(() => readStored(NAME_KEY) ?? '')
  const join = useJoinSession()

  function submit(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeCode(code)
    join.mutate(
      { code: normalized, name },
      {
        onSuccess: (res) => {
          writeStored(NAME_KEY, name.trim())
          onJoined({ code: normalized, memberId: res.memberId, token: res.token, role: Role.Guest })
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {fixedCode === undefined && (
        <Field label="Session code">
          <input
            className={`${inputClass} text-center font-display text-2xl uppercase tracking-[0.3em]`}
            placeholder="ABCDE"
            value={code}
            maxLength={5}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
            required
          />
          <span className="text-xs font-normal text-muted">5 letters or numbers, shown on the host's screen.</span>
        </Field>
      )}
      <Field label="Your name">
        <input
          className={inputClass}
          placeholder="What should we call you?"
          value={name}
          maxLength={24}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>
      <ErrorText message={join.error?.message} />
      <Button type="submit" size="lg" block disabled={join.isPending}>
        {join.isPending ? 'Joining…' : 'Join'}
      </Button>
    </form>
  )
}
