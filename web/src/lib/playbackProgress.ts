import type { PositionUpdate, SessionState } from '../protocol'

type Reported = Pick<PositionUpdate, 'itemId' | 'positionMs'>

export function playbackProgress(state: SessionState | undefined, reported?: Reported): number {
  const nowPlaying = state?.nowPlaying
  if (!state || !nowPlaying) return 0
  const position = reported?.itemId === nowPlaying.itemId ? reported.positionMs : state.player.positionMs
  return Math.min(position, nowPlaying.song.durationMs)
}
