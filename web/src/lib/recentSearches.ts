import { readStored, writeStored } from './storage'

const KEY = 'bidyoke:recent-searches'
const MAX = 5

export function loadRecentSearches(): string[] {
  try {
    const parsed: unknown = JSON.parse(readStored(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : []
  } catch {
    return []
  }
}

export function rememberSearch(query: string): string[] {
  const next = [query, ...loadRecentSearches().filter((q) => q !== query)].slice(0, MAX)
  writeStored(KEY, JSON.stringify(next))
  return next
}
