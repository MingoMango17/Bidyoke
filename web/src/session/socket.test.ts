import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionState } from '../protocol'
import {
  backoffDelay,
  SessionSocket,
  type CloseReason,
  type ConnectionStatus,
  type IdentityCheck,
} from './socket'

class FakeSocket {
  static instances: FakeSocket[] = []
  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null

  constructor() {
    FakeSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
  }

  open() {
    this.readyState = 1
    this.onopen?.()
  }

  message(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }

  drop(code: number) {
    this.readyState = 3
    this.onclose?.({ code })
  }
}

function stateWithRev(rev: number): SessionState {
  return {
    code: 'ABCDE',
    protocolVersion: 1,
    rev,
    queue: [],
    nowPlaying: null,
    player: { status: 'idle', positionMs: 0, updatedAt: '2026-10-17T00:00:00Z' },
    members: [],
    scores: [],
    settings: { maxQueuePerMember: 3, locked: false },
  }
}

function setup(check: IdentityCheck = 'ok') {
  const statuses: Array<[ConnectionStatus, CloseReason | undefined]> = []
  const states: number[] = []
  const errors: string[] = []
  const notices: string[] = []
  const socket = new SessionSocket({
    url: 'ws://test/ws/sessions/ABCDE?token=t',
    checkIdentity: () => Promise.resolve(check),
    random: () => 1,
    createSocket: () => new FakeSocket() as unknown as WebSocket,
    handlers: {
      onStatus: (s, reason) => statuses.push([s, reason]),
      onState: (s) => states.push(s.rev),
      onError: (e) => errors.push(e.code),
      onNotice: (n) => notices.push(n.kind),
    },
  })
  const current = () => FakeSocket.instances[FakeSocket.instances.length - 1]
  return { socket, statuses, states, errors, notices, current }
}

beforeEach(() => {
  FakeSocket.instances = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('backoffDelay', () => {
  it('grows exponentially and caps at 10 seconds', () => {
    expect(backoffDelay(0, 1)).toBe(500)
    expect(backoffDelay(1, 1)).toBe(1000)
    expect(backoffDelay(10, 1)).toBe(10_000)
  })

  it('jitters between half and full of the ceiling', () => {
    expect(backoffDelay(2, 0)).toBe(1000)
    expect(backoffDelay(2, 1)).toBe(2000)
  })
})

describe('SessionSocket', () => {
  it('reports open and delivers state', () => {
    const { socket, statuses, states, current } = setup()
    socket.start()
    current().open()
    current().message({ type: 'state', payload: stateWithRev(1) })
    expect(statuses.map(([s]) => s)).toEqual(['connecting', 'open'])
    expect(states).toEqual([1])
  })

  it('ignores state with a rev not newer than the last applied', () => {
    const { socket, states, current } = setup()
    socket.start()
    current().open()
    current().message({ type: 'state', payload: stateWithRev(5) })
    current().message({ type: 'state', payload: stateWithRev(5) })
    current().message({ type: 'state', payload: stateWithRev(3) })
    current().message({ type: 'state', payload: stateWithRev(6) })
    expect(states).toEqual([5, 6])
  })

  it('forwards errors and notices and ignores unknown or malformed messages', () => {
    const { socket, errors, notices, current } = setup()
    socket.start()
    current().open()
    current().message({ type: 'error', payload: { id: 'c-1', code: 'forbidden', message: 'x' } })
    current().message({ type: 'notice', payload: { kind: 'song_skipped' } })
    current().message({ type: 'something.new', payload: {} })
    current().onmessage?.({ data: 'not json' })
    expect(errors).toEqual(['forbidden'])
    expect(notices).toEqual(['song_skipped'])
  })

  it('reconnects with backoff after a drop and restarts the delay once state arrives', async () => {
    const { socket, statuses, current } = setup()
    socket.start()
    current().open()
    current().message({ type: 'state', payload: stateWithRev(1) })
    current().drop(1006)
    expect(statuses.at(-1)?.[0]).toBe('reconnecting')
    expect(FakeSocket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(500)
    expect(FakeSocket.instances).toHaveLength(2)

    current().drop(1006)
    await vi.advanceTimersByTimeAsync(999)
    expect(FakeSocket.instances).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeSocket.instances).toHaveLength(3)

    current().open()
    current().message({ type: 'state', payload: stateWithRev(2) })
    current().drop(1006)
    await vi.advanceTimersByTimeAsync(500)
    expect(FakeSocket.instances).toHaveLength(4)
  })

  it.each([
    [4001, 'invalid_token'],
    [4003, 'kicked'],
    [4004, 'ended'],
    [4009, 'replaced'],
  ] as const)('does not reconnect after close code %i', async (code, reason) => {
    const { socket, statuses, current } = setup()
    socket.start()
    current().open()
    current().drop(code)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(statuses.at(-1)).toEqual(['closed', reason])
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('checks the identity when a connection never opened', async () => {
    const { socket, statuses, current } = setup('invalid_token')
    socket.start()
    current().drop(1006)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(statuses.at(-1)).toEqual(['closed', 'invalid_token'])
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('retries when the identity is fine but the connection never opened', async () => {
    const { socket, current } = setup('ok')
    socket.start()
    current().drop(1006)
    await vi.advanceTimersByTimeAsync(500)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('sends commands with an id and rejects them while not open', () => {
    const { socket, current } = setup()
    socket.start()
    expect(socket.send('player.next')).toBeUndefined()
    current().open()
    expect(socket.send('queue.add', { songId: 'local:1' })).toBe('c-1')
    expect(socket.send('player.next')).toBe('c-2')
    expect(current().sent.map((s) => JSON.parse(s))).toEqual([
      { type: 'queue.add', id: 'c-1', payload: { songId: 'local:1' } },
      { type: 'player.next', id: 'c-2' },
    ])
  })

  it('pings every 25 seconds while open', async () => {
    const { socket, current } = setup()
    socket.start()
    current().open()
    await vi.advanceTimersByTimeAsync(50_000)
    expect(current().sent.map((s) => JSON.parse(s).type)).toEqual(['ping', 'ping'])
  })

  it('stop cancels a pending reconnect and ignores later events', async () => {
    const { socket, statuses, current } = setup()
    socket.start()
    const first = current()
    first.open()
    first.drop(1006)
    socket.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
    first.onclose?.({ code: 4003 })
    expect(statuses.at(-1)?.[0]).toBe('reconnecting')
  })
})
