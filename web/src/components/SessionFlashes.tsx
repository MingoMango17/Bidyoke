import { noticeText } from '../lib/notices'
import type { SessionApi } from '../session/useSession'
import { Flash } from './Flash'

export function SessionFlashes({ session }: { session: SessionApi }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 top-16 z-50 flex flex-col items-center gap-2">
      <Flash item={session.lastError} message={session.lastError?.message} tone="error" />
      <Flash
        item={session.lastNotice}
        message={session.lastNotice && noticeText(session.lastNotice)}
        tone="info"
      />
    </div>
  )
}
