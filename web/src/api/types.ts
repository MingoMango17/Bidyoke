export type Role = 'host' | 'guest'

export interface CreateSessionResponse {
  code: string
  memberId: string
  token: string
  joinUrl: string
}

export interface SessionInfo {
  code: string
  memberCount: number
  locked: boolean
}

export interface JoinResponse {
  memberId: string
  token: string
}

export interface AppConfig {
  sources: string[]
  mediaAuth: string
  maxQueuePerMember: number
  protocolVersion: number
}

export interface RejoinResponse {
  memberId: string
  role: Role
}
