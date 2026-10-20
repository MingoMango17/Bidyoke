import { NoticeKind, type Notice } from '../protocol'
import { PlaybackFailure } from './youtube'

export function noticeText(notice: Notice, memberId?: string): string | undefined {
  switch (notice.kind) {
    case NoticeKind.SongSkipped:
      return notice.reason === PlaybackFailure.EmbedBlocked
        ? 'A song was skipped because it cannot be played here.'
        : 'A song was skipped.'
    case NoticeKind.HostDisconnected:
      return 'The host disconnected. Playback is paused.'
    case NoticeKind.HostReconnected:
      return 'The host is back.'
    case NoticeKind.SessionLocked:
      return 'The session no longer accepts new members.'
    case NoticeKind.MemberKicked:
      return 'A member was removed from the session.'
    case NoticeKind.MemberPromoted:
      return notice.memberId === memberId ? 'You are now a subhost.' : undefined
    default:
      return undefined
  }
}
