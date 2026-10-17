import { QRCodeSVG } from 'qrcode.react'
import { Card } from './Layout'

export function JoinCard({ code }: { code: string }) {
  const url = `${location.origin}/s/${code}`
  return (
    <Card title="Join this session">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-white p-2">
          <QRCodeSVG value={url} size={128} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">Code</p>
          <p className="text-4xl font-bold tracking-widest">{code}</p>
          <p className="mt-1 break-all text-xs text-zinc-500">{url}</p>
        </div>
      </div>
    </Card>
  )
}
