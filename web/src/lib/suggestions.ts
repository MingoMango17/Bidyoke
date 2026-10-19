import { SuggestionReason, type Song, type Suggestion } from '../protocol'

const TITLES: Record<SuggestionReason, (context: string | null) => string> = {
  [SuggestionReason.SameChannel]: (context) => `More from ${context ?? 'this channel'}`,
  [SuggestionReason.PlayedHere]: () => 'Play again',
}

export interface SuggestionGroup {
  reason: SuggestionReason
  title: string
  songs: Song[]
}

export function groupSuggestions(suggestions: Suggestion[]): SuggestionGroup[] {
  const groups = new Map<SuggestionReason, SuggestionGroup>()
  for (const { song, reason, context } of suggestions) {
    const title = TITLES[reason]
    if (!title) continue
    const group = groups.get(reason) ?? { reason, title: title(context), songs: [] }
    group.songs.push(song)
    groups.set(reason, group)
  }
  return [...groups.values()]
}
