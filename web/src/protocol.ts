import type { Role } from './api/types'

export const SongSource = { YouTube: 'youtube', Local: 'local' } as const
export type SongSource = (typeof SongSource)[keyof typeof SongSource]

export const PlayerStatus = { Idle: 'idle', Playing: 'playing', Paused: 'paused' } as const
export type PlayerStatus = (typeof PlayerStatus)[keyof typeof PlayerStatus]

export const SuggestionReason = { PlayedHere: 'played_here', SameChannel: 'same_channel' } as const
export type SuggestionReason = (typeof SuggestionReason)[keyof typeof SuggestionReason]

export const NoticeKind = {
  SongSkipped: 'song_skipped',
  HostDisconnected: 'host_disconnected',
  HostReconnected: 'host_reconnected',
  SessionLocked: 'session_locked',
  MemberKicked: 'member_kicked',
} as const
export type NoticeKind = (typeof NoticeKind)[keyof typeof NoticeKind]

export interface Song {
  songId: string
  source: SongSource
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

export interface Suggestion {
  song: Song
  reason: SuggestionReason
  context: string | null
}

export interface PlayerState {
  status: PlayerStatus
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
  suggestions: Suggestion[]
  settings: { maxQueuePerMember: number; locked: boolean }
}

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
