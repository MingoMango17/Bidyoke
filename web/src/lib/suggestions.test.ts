import { describe, expect, it } from 'vitest'
import { SuggestionReason, type Song, type Suggestion } from '../protocol'
import { groupSuggestions, SUGGESTION_TITLES } from './suggestions'

function song(songId: string): Song {
  return {
    songId,
    source: 'local',
    title: songId,
    artist: null,
    thumbnail: '',
    durationMs: 1000,
    capabilities: { lyrics: false, scoring: false },
  }
}

describe('groupSuggestions', () => {
  it('returns nothing for no suggestions', () => {
    expect(groupSuggestions([])).toEqual([])
  })

  it('groups songs by reason and keeps their order', () => {
    const suggestions: Suggestion[] = [
      { song: song('a'), reason: SuggestionReason.PlayedHere },
      { song: song('b'), reason: SuggestionReason.PlayedHere },
    ]
    const groups = groupSuggestions(suggestions)
    expect(groups).toHaveLength(1)
    expect(groups[0].reason).toBe(SuggestionReason.PlayedHere)
    expect(groups[0].songs.map((s) => s.songId)).toEqual(['a', 'b'])
  })

  it('ignores reasons it does not know', () => {
    const suggestions = [
      { song: song('a'), reason: 'because_you_played' },
      { song: song('b'), reason: SuggestionReason.PlayedHere },
    ] as Suggestion[]
    expect(groupSuggestions(suggestions).map((g) => g.reason)).toEqual([
      SuggestionReason.PlayedHere,
    ])
  })

  it('has a title for every known reason', () => {
    for (const reason of Object.values(SuggestionReason)) {
      expect(SUGGESTION_TITLES[reason]).toBeTruthy()
    }
  })
})
