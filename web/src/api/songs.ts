import { useQuery } from '@tanstack/react-query'
import type { Song } from '../protocol'
import { api } from './client'
import type { AppConfig } from './types'

export type PlaybackInfo =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'local'; audioUrl: string; durationMs: number }

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

export function usePlayback(songId: string | undefined, token: string) {
  return useQuery({
    queryKey: ['playback', songId],
    queryFn: () =>
      api<{ song: Song; playback: PlaybackInfo }>(`/api/songs/${encodeURIComponent(songId ?? '')}`, {
        token,
      }),
    enabled: songId !== undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}
