import {
  ClientMessage,
  ServerMessageType,
  type CommandArgs,
  type CommandType,
  type Notice,
  type PositionUpdate,
  type ServerError,
  type ServerMessage,
  type SessionState,
} from '../protocol'

export const ConnectionStatus = {
  Connecting: 'connecting',
  Open: 'open',
  Reconnecting: 'reconnecting',
  Closed: 'closed',
} as const
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus]

export const CloseReason = {
  InvalidToken: 'invalid_token',
  Ended: 'ended',
  Kicked: 'kicked',
  Replaced: 'replaced',
} as const
export type CloseReason = (typeof CloseReason)[keyof typeof CloseReason]

export const IdentityCheck = {
  Ok: 'ok',
  InvalidToken: CloseReason.InvalidToken,
  Ended: CloseReason.Ended,
} as const
export type IdentityCheck = (typeof IdentityCheck)[keyof typeof IdentityCheck]

export interface SocketHandlers {
  onStatus: (status: ConnectionStatus, reason?: CloseReason) => void
  onState: (state: SessionState) => void
  onError: (error: ServerError) => void
  onNotice: (notice: Notice) => void
  onPosition?: (position: PositionUpdate) => void
}

export interface SocketOptions {
  url: string
  checkIdentity: () => Promise<IdentityCheck>
  handlers: SocketHandlers
  createSocket?: (url: string) => WebSocket
  random?: () => number
}

const OPEN = 1
const BACKOFF_BASE_MS = 500
const BACKOFF_CAP_MS = 10_000
const PING_INTERVAL_MS = 25_000

// 4009 is terminal on purpose: two tabs for one member would otherwise kick each other forever.
const TERMINAL_CLOSE: Record<number, CloseReason> = {
  4001: CloseReason.InvalidToken,
  4003: CloseReason.Kicked,
  4004: CloseReason.Ended,
  4009: CloseReason.Replaced,
}

export function backoffDelay(attempt: number, random: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt)
  return ceiling / 2 + (ceiling / 2) * random
}

export class SessionSocket {
  private options: SocketOptions
  private ws: WebSocket | null = null
  private stopped = true
  private attempt = 0
  private lastRev = -1
  private commandSeq = 0
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private pingTimer: ReturnType<typeof setInterval> | undefined

  constructor(options: SocketOptions) {
    this.options = options
  }

  start(): void {
    this.clear()
    this.stopped = false
    this.attempt = 0
    this.connect(ConnectionStatus.Connecting)
  }

  stop(): void {
    this.stopped = true
    this.clear()
  }

  send<T extends CommandType>(type: T, ...args: CommandArgs<T>): string | undefined {
    if (!this.ws || this.ws.readyState !== OPEN) return undefined
    const id = `c-${++this.commandSeq}`
    const payload = args[0]
    this.ws.send(JSON.stringify(payload === undefined ? { type, id } : { type, id, payload }))
    return id
  }

  private connect(status: ConnectionStatus): void {
    this.options.handlers.onStatus(status)
    const create = this.options.createSocket ?? ((url: string) => new WebSocket(url))
    const ws = create(this.options.url)
    let opened = false
    this.ws = ws

    ws.onopen = () => {
      if (this.ws !== ws) return
      opened = true
      this.options.handlers.onStatus(ConnectionStatus.Open)
      this.pingTimer = setInterval(() => {
        if (ws.readyState === OPEN) ws.send(JSON.stringify({ type: ClientMessage.Ping }))
      }, PING_INTERVAL_MS)
    }
    ws.onmessage = (event) => {
      if (this.ws === ws) this.handleMessage(String(event.data))
    }
    ws.onclose = (event) => {
      if (this.ws !== ws) return
      this.ws = null
      this.stopPing()
      if (this.stopped) return
      const reason = TERMINAL_CLOSE[event.code]
      if (reason) this.options.handlers.onStatus(ConnectionStatus.Closed, reason)
      else if (opened) this.scheduleReconnect()
      else void this.checkThenRetry()
    }
  }

  private handleMessage(raw: string): void {
    let message: ServerMessage
    try {
      message = JSON.parse(raw) as ServerMessage
    } catch {
      return
    }
    const { handlers } = this.options
    switch (message.type) {
      case ServerMessageType.State:
        if (message.payload.rev <= this.lastRev) return
        this.lastRev = message.payload.rev
        this.attempt = 0
        handlers.onState(message.payload)
        return
      case ServerMessageType.Error:
        handlers.onError(message.payload)
        return
      case ServerMessageType.Notice:
        handlers.onNotice(message.payload)
        return
      case ServerMessageType.PlayerPosition:
        handlers.onPosition?.(message.payload)
        return
      default:
        return
    }
  }

  private async checkThenRetry(): Promise<void> {
    this.options.handlers.onStatus(ConnectionStatus.Reconnecting)
    const result = await this.options.checkIdentity()
    if (this.stopped) return
    if (result === IdentityCheck.Ok) this.scheduleReconnect()
    else this.options.handlers.onStatus(ConnectionStatus.Closed, result)
  }

  private scheduleReconnect(): void {
    this.options.handlers.onStatus(ConnectionStatus.Reconnecting)
    const random = this.options.random ?? Math.random
    const delay = backoffDelay(this.attempt++, random())
    this.retryTimer = setTimeout(() => this.connect(ConnectionStatus.Reconnecting), delay)
  }

  private stopPing(): void {
    clearInterval(this.pingTimer)
    this.pingTimer = undefined
  }

  private clear(): void {
    clearTimeout(this.retryTimer)
    this.retryTimer = undefined
    this.stopPing()
    const ws = this.ws
    this.ws = null
    ws?.close()
  }
}
