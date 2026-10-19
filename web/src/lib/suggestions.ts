import { SuggestionReason, type Song, type Suggestion } from '../protocol'

export const SUGGESTION_TITLES: Record<SuggestionReason, string> = {
  [SuggestionReason.PlayedHere]: 'Play again',
}

export interface SuggestionGroup {
  reason: SuggestionReason
  songs: Song[]
}

export function groupSuggestions(suggestions: Suggestion[]): SuggestionGroup[] {
  const groups = new Map<SuggestionReason, Song[]>()
  for (const { song, reason } of suggestions) {
    if (!(reason in SUGGESTION_TITLES)) continue
    groups.set(reason, [...(groups.get(reason) ?? []), song])
  }
  return [...groups].map(([reason, songs]) => ({ reason, songs }))
}
