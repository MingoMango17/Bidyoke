import { describe, expect, it } from 'vitest'
import { endedReason } from './closed'
import { CloseReason, ConnectionStatus } from './socket'

describe('endedReason', () => {
  it('returns the reason once the session is over', () => {
    expect(endedReason(ConnectionStatus.Closed, CloseReason.Ended)).toBe(CloseReason.Ended)
    expect(endedReason(ConnectionStatus.Closed, CloseReason.Kicked)).toBe(CloseReason.Kicked)
    expect(endedReason(ConnectionStatus.Closed, CloseReason.InvalidToken)).toBe(
      CloseReason.InvalidToken,
    )
  })

  it('keeps the page usable when another tab replaced this one', () => {
    expect(endedReason(ConnectionStatus.Closed, CloseReason.Replaced)).toBeUndefined()
  })

  it('returns nothing while the connection is not closed', () => {
    for (const status of [
      ConnectionStatus.Connecting,
      ConnectionStatus.Open,
      ConnectionStatus.Reconnecting,
    ]) {
      expect(endedReason(status, undefined)).toBeUndefined()
    }
  })
})
