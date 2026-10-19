// @vitest-environment jsdom
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '../api/types'
import { useSession } from './useSession'

class FakeSocket {
  static instances: FakeSocket[] = []
  url: string
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeSocket.instances.push(this)
  }

  send() {}

  close() {
    this.readyState = 3
  }
}

const identity = { code: 'ABCDE', memberId: 'm_1', token: 'tok', role: Role.Host }

function Probe() {
  useSession(identity)
  return null
}

let root: Root

beforeEach(() => {
  FakeSocket.instances = []
  vi.stubGlobal('WebSocket', FakeSocket)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = createRoot(document.createElement('div'))
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

describe('useSession', () => {
  it('opens exactly one socket under StrictMode', async () => {
    await act(async () => root.render(<StrictMode><Probe /></StrictMode>))
    await settle()
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('opens one socket without StrictMode', async () => {
    await act(async () => root.render(<Probe />))
    await settle()
    expect(FakeSocket.instances).toHaveLength(1)
    expect(FakeSocket.instances[0].url).toContain('/ws/sessions/ABCDE?token=tok')
  })

  it('closes its socket when the component unmounts', async () => {
    await act(async () => root.render(<Probe />))
    await settle()
    const [socket] = FakeSocket.instances
    await act(async () => root.unmount())
    expect(socket.readyState).toBe(3)
    root = createRoot(document.createElement('div'))
  })
})
