import { describe, expect, it } from 'vitest'
import { formatDuration } from './format'
import { noticeText } from './notices'

describe('formatDuration', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(363_000)).toBe('6:03')
    expect(formatDuration(3_600_000)).toBe('60:00')
  })

  it('rounds to the nearest second and never goes negative', () => {
    expect(formatDuration(1_499)).toBe('0:01')
    expect(formatDuration(-5)).toBe('0:00')
  })
})

describe('noticeText', () => {
  it('describes known notices', () => {
    expect(noticeText({ kind: 'host_disconnected' })).toMatch(/paused/)
    expect(noticeText({ kind: 'song_skipped', reason: 'embed_blocked' })).toMatch(/cannot be played/)
    expect(noticeText({ kind: 'song_skipped' })).toBe('A song was skipped.')
  })

  it('returns nothing for a kind it does not know', () => {
    expect(noticeText({ kind: 'brand_new' } as never)).toBeUndefined()
  })
})
