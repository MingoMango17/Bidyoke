import type { Notice } from '../protocol'

export function noticeText(notice: Notice): string | undefined {
  switch (notice.kind) {
    case 'song_skipped':
      return notice.reason === 'embed_blocked'
        ? 'A song was skipped because it cannot be played here.'
        : 'A song was skipped.'
    case 'host_disconnected':
      return 'The host disconnected. Playback is paused.'
    case 'host_reconnected':
      return 'The host is back.'
    case 'session_locked':
      return 'The session no longer accepts new members.'
    case 'member_kicked':
      return 'A member was removed from the session.'
    default:
      return undefined
  }
}
