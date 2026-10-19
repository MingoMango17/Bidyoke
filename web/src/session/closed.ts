import { CloseReason, ConnectionStatus } from './socket'

export type EndReason = Exclude<CloseReason, typeof CloseReason.Replaced>

export function endedReason(
  status: ConnectionStatus,
  reason: CloseReason | undefined,
): EndReason | undefined {
  if (status !== ConnectionStatus.Closed || reason === undefined) return undefined
  return reason === CloseReason.Replaced ? undefined : reason
}
