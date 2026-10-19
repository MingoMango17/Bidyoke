import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { RejoinResponse } from '../api/types'
import { clearIdentity, type Identity } from '../lib/identity'
import type {
  CommandArgs,
  CommandType,
  Notice,
  ServerError,
  SessionState,
} from '../protocol'
import { endedReason } from './closed'
import {
  SessionSocket,
  ConnectionStatus,
  IdentityCheck,
  type CloseReason,
} from './socket'

const WS_URL: string | undefined = import.meta.env.VITE_WS_URL

function socketUrl(code: string, token: string): string {
  const base = WS_URL ?? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
  return `${base}/ws/sessions/${code}?token=${encodeURIComponent(token)}`
}

async function checkIdentity(code: string, token: string): Promise<IdentityCheck> {
  try {
    await api<RejoinResponse>(`/api/sessions/${code}/rejoin`, { method: 'POST', token })
    return IdentityCheck.Ok
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return IdentityCheck.InvalidToken
      if (error.status === 404) return IdentityCheck.Ended
    }
    return IdentityCheck.Ok
  }
}

export type SessionApi = ReturnType<typeof useSession>

export function useSession(identity: Identity | undefined) {
  const code = identity?.code
  const token = identity?.token
  const socketRef = useRef<SessionSocket>(null)
  const [generation, setGeneration] = useState(0)
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.Connecting)
  const [closeReason, setCloseReason] = useState<CloseReason>()
  const [state, setState] = useState<SessionState>()
  const [lastError, setLastError] = useState<ServerError>()
  const [lastNotice, setLastNotice] = useState<Notice>()

  useEffect(() => {
    if (!code || !token) return
    const next = new SessionSocket({
      url: socketUrl(code, token),
      checkIdentity: () => checkIdentity(code, token),
      handlers: {
        onStatus: (s, reason) => {
          setStatus(s)
          setCloseReason(reason)
        },
        onState: setState,
        onError: setLastError,
        onNotice: setLastNotice,
      },
    })
    next.start()
    socketRef.current = next
    return () => {
      next.stop()
      socketRef.current = null
    }
  }, [code, token, generation])

  const send = useCallback(
    <T extends CommandType>(type: T, ...args: CommandArgs<T>) =>
      socketRef.current?.send(type, ...args),
    [],
  )
  const reconnect = useCallback(() => setGeneration((g) => g + 1), [])

  const over = endedReason(status, closeReason) !== undefined
  useEffect(() => {
    if (over && code) clearIdentity(code)
  }, [over, code])

  return { status, closeReason, state, lastError, lastNotice, send, reconnect }
}
