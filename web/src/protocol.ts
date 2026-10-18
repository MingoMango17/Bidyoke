import type { Role } from './api/types'

export interface Song {
  songId: string
  source: 'youtube' | 'local'
  title: string
  artist: string | null
  thumbnail: string
  durationMs: number
  capabilities: { lyrics: boolean; scoring: boolean }
}

export interface QueueItem {
  itemId: string
  song: Song
  addedBy: string
  addedAt: string
}

export interface Member {
  memberId: string
  name: string
  role: Role
  connected: boolean
}

export interface PlayerState {
  status: 'idle' | 'playing' | 'paused'
  positionMs: number
  updatedAt: string
}

export interface Score {
  itemId: string
  memberId: string
  score: number
  breakdown: Record<string, number>
}

export interface SessionState {
  code: string
  protocolVersion: number
  rev: number
  queue: QueueItem[]
  nowPlaying: QueueItem | null
  player: PlayerState
  members: Member[]
  scores: Score[]
  settings: { maxQueuePerMember: number; locked: boolean }
}

export type NoticeKind =
  | 'song_skipped'
  | 'host_disconnected'
  | 'host_reconnected'
  | 'session_locked'
  | 'member_kicked'

export interface Notice {
  kind: NoticeKind
  itemId?: string
  memberId?: string
  reason?: string
}

export interface ServerError {
  id?: string
  code: string
  message: string
}

export interface PositionUpdate {
  itemId: string
  positionMs: number
  serverTime: number
}

export const ClientMessage = { Ping: 'ping' } as const

export const ServerMessageType = {
  State: 'state',
  Ack: 'ack',
  Error: 'error',
  Notice: 'notice',
  PlayerPosition: 'player.position',
  Pong: 'pong',
} as const

export type ServerMessage =
  | { type: typeof ServerMessageType.State; payload: SessionState }
  | { type: typeof ServerMessageType.Ack; payload: { id: string } }
  | { type: typeof ServerMessageType.Error; payload: ServerError }
  | { type: typeof ServerMessageType.Notice; payload: Notice }
  | { type: typeof ServerMessageType.PlayerPosition; payload: PositionUpdate }
  | { type: typeof ServerMessageType.Pong }

export const Command = {
  QueueAdd: 'queue.add',
  QueueRemove: 'queue.remove',
  QueueMove: 'queue.move',
  PlayerNext: 'player.next',
  PlayerPause: 'player.pause',
  PlayerResume: 'player.resume',
  PlayerEnded: 'player.ended',
  PlayerError: 'player.error',
  PlayerPosition: 'player.position',
  ScoreSubmit: 'score.submit',
  SessionLock: 'session.lock',
  SessionKick: 'session.kick',
  SessionEnd: 'session.end',
} as const

export interface CommandPayloads {
  [Command.QueueAdd]: { songId: string }
  [Command.QueueRemove]: { itemId: string }
  [Command.QueueMove]: { itemId: string; toIndex: number }
  [Command.PlayerNext]: undefined
  [Command.PlayerPause]: undefined
  [Command.PlayerResume]: undefined
  [Command.PlayerEnded]: { itemId: string }
  [Command.PlayerError]: { itemId: string; reason: string }
  [Command.PlayerPosition]: { itemId: string; positionMs: number }
  [Command.ScoreSubmit]: {
    itemId: string
    score: number
    breakdown?: Record<string, number>
  }
  [Command.SessionLock]: { locked: boolean }
  [Command.SessionKick]: { memberId: string }
  [Command.SessionEnd]: undefined
}

export type CommandType = keyof CommandPayloads

export type CommandArgs<T extends CommandType> = CommandPayloads[T] extends undefined
  ? []
  : [payload: CommandPayloads[T]]
