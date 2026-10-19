import { describe, expect, it } from 'vitest'
import { SuggestionReason, type Song, type Suggestion } from '../protocol'
import { groupSuggestions } from './suggestions'

function song(songId: string): Song {
  return {
    songId,
    source: 'youtube',
    title: songId,
    artist: null,
    thumbnail: '',
    durationMs: 1000,
    capabilities: { lyrics: false, scoring: false },
  }
}

function suggestion(songId: string, reason: SuggestionReason, context: string | null = null) {
  return { song: song(songId), reason, context } as Suggestion
}

describe('groupSuggestions', () => {
  it('returns nothing for no suggestions', () => {
    expect(groupSuggestions([])).toEqual([])
  })

  it('titles the channel group with the channel name', () => {
    const groups = groupSuggestions([
      suggestion('a', SuggestionReason.SameChannel, 'Atomic Karaoke'),
      suggestion('b', SuggestionReason.SameChannel, 'Atomic Karaoke'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('More from Atomic Karaoke')
    expect(groups[0].songs.map((s) => s.songId)).toEqual(['a', 'b'])
  })

  it('falls back to a generic title when the channel name is missing', () => {
    const groups = groupSuggestions([suggestion('a', SuggestionReason.SameChannel)])
    expect(groups[0].title).toBe('More from this channel')
  })

  it('keeps one group per reason in the order the server sent them', () => {
    const groups = groupSuggestions([
      suggestion('a', SuggestionReason.SameChannel, 'Hub'),
      suggestion('b', SuggestionReason.PlayedHere),
      suggestion('c', SuggestionReason.SameChannel, 'Hub'),
    ])
    expect(groups.map((g) => [g.reason, g.songs.length])).toEqual([
      [SuggestionReason.SameChannel, 2],
      [SuggestionReason.PlayedHere, 1],
    ])
    expect(groups[1].title).toBe('Play again')
  })

  it('ignores reasons it does not know', () => {
    const groups = groupSuggestions([
      { song: song('a'), reason: 'because_you_played', context: null },
      suggestion('b', SuggestionReason.PlayedHere),
    ] as Suggestion[])
    expect(groups.map((g) => g.reason)).toEqual([SuggestionReason.PlayedHere])
  })
})
