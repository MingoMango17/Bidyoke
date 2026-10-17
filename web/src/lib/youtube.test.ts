import { describe, expect, it } from 'vitest'
import { errorReason } from './youtube'

describe('errorReason', () => {
  it('maps embedding-disabled codes to embed_blocked', () => {
    expect(errorReason(101)).toBe('embed_blocked')
    expect(errorReason(150)).toBe('embed_blocked')
  })

  it('maps every other YouTube error to playback_error', () => {
    for (const code of [2, 5, 100]) expect(errorReason(code)).toBe('playback_error')
  })
})
