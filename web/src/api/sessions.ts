import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type {
  CreateSessionResponse,
  JoinResponse,
  RejoinResponse,
  SessionInfo,
} from './types'

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export function useCreateSession() {
  return useMutation({
    mutationFn: () => api<CreateSessionResponse>('/api/sessions', { method: 'POST', body: {} }),
  })
}

export function useJoinSession() {
  return useMutation({
    mutationFn: ({ code, name }: { code: string; name: string }) =>
      api<JoinResponse>(`/api/sessions/${normalizeCode(code)}/join`, {
        method: 'POST',
        body: { name: name.trim() },
      }),
  })
}

export function useSessionInfo(code: string) {
  return useQuery({
    queryKey: ['session', code],
    queryFn: () => api<SessionInfo>(`/api/sessions/${code}`),
    retry: false,
  })
}

export function useRejoin(code: string, token: string | undefined) {
  return useQuery({
    queryKey: ['rejoin', code, token],
    queryFn: () =>
      api<RejoinResponse>(`/api/sessions/${code}/rejoin`, { method: 'POST', token }),
    enabled: token !== undefined,
    retry: false,
  })
}
