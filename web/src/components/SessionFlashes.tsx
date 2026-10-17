import { noticeText } from '../lib/notices'
import type { SessionApi } from '../session/useSession'
import { Flash } from './Flash'

export function SessionFlashes({ session }: { session: SessionApi }) {
  return (
    <>
      <Flash item={session.lastError} message={session.lastError?.message} tone="error" />
      <Flash
        item={session.lastNotice}
        message={session.lastNotice && noticeText(session.lastNotice)}
        tone="info"
      />
    </>
  )
}
