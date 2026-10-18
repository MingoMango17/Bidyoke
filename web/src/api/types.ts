export const Role = { Host: 'host', Guest: 'guest' } as const
export type Role = (typeof Role)[keyof typeof Role]

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
