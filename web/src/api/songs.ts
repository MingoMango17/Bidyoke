import { useQuery } from '@tanstack/react-query'
import type { Song } from '../protocol'
import { api } from './client'
import type { AppConfig } from './types'

interface SearchResponse {
  results: Song[]
  sources: string[]
}

const FIVE_MINUTES = 5 * 60_000

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api<AppConfig>('/api/config'),
    staleTime: Infinity,
  })
}

export function useSongSearch(token: string, query: string, source: string) {
  return useQuery({
    queryKey: ['search', source, query],
    queryFn: () =>
      api<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}&limit=20`,
        { token },
      ),
    enabled: query.length > 0,
    staleTime: FIVE_MINUTES,
    retry: false,
  })
}
