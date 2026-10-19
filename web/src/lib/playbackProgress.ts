import type { SessionState } from '../protocol'

export function playbackProgress(state: SessionState | undefined): number {
  const nowPlaying = state?.nowPlaying
  if (!state || !nowPlaying) return 0
  return Math.min(state.player.positionMs, nowPlaying.song.durationMs)
}
