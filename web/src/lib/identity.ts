import type { Role } from '../api/types'

export interface Identity {
  code: string
  memberId: string
  token: string
  role: Role
}

const key = (code: string) => `bidyoke:identity:${code}`

export function loadIdentity(code: string): Identity | undefined {
  try {
    const raw = localStorage.getItem(key(code))
    return raw ? (JSON.parse(raw) as Identity) : undefined
  } catch {
    return undefined
  }
}

export function saveIdentity(identity: Identity): void {
  try {
    localStorage.setItem(key(identity.code), JSON.stringify(identity))
  } catch {
    // storage unavailable; the session still works until the page reloads
  }
}

export function clearIdentity(code: string): void {
  try {
    localStorage.removeItem(key(code))
  } catch {
    // nothing stored to clear
  }
}
