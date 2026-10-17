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

export type ServerMessage =
  | { type: 'state'; payload: SessionState }
  | { type: 'ack'; payload: { id: string } }
  | { type: 'error'; payload: ServerError }
  | { type: 'notice'; payload: Notice }
  | { type: 'player.position'; payload: PositionUpdate }
  | { type: 'pong' }

export interface CommandPayloads {
  'queue.add': { songId: string }
  'queue.remove': { itemId: string }
  'queue.move': { itemId: string; toIndex: number }
  'player.next': undefined
  'player.pause': undefined
  'player.resume': undefined
  'player.ended': { itemId: string }
  'player.error': { itemId: string; reason: string }
  'player.position': { itemId: string; positionMs: number }
  'score.submit': {
    itemId: string
    score: number
    breakdown?: Record<string, number>
  }
  'session.lock': { locked: boolean }
  'session.kick': { memberId: string }
  'session.end': undefined
}

export type CommandType = keyof CommandPayloads

export type CommandArgs<T extends CommandType> = CommandPayloads[T] extends undefined
  ? []
  : [payload: CommandPayloads[T]]
