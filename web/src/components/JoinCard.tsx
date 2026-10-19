import { Check, Copy, Maximize2, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Card } from './Layout'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

export function JoinCard({ code }: { code: string }) {
  const url = `${location.origin}/s/${code}`
  const [copied, setCopied] = useState(false)
  const [projecting, setProjecting] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked; the link is still shown on screen
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="shrink-0 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-line">
          <QRCodeSVG value={url} size={96} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Join code</p>
          <p className="font-display text-4xl font-bold tracking-[0.2em] tabular-nums">{code}</p>
          <p className="truncate text-xs text-muted">{url}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {'share' in navigator && (
          <Button variant="secondary" size="sm" onClick={() => void navigator.share({ url, title: 'Join my Bidyoke session' }).catch(() => {})}>
            <Share2 className="size-4" />
            Share
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setProjecting(true)}>
          <Maximize2 className="size-4" />
          Show big
        </Button>
      </div>
      <Modal open={projecting} onClose={() => setProjecting(false)} label="Join code" className="max-w-2xl text-center">
        <p className="text-lg text-muted">Scan or go to</p>
        <p className="break-all text-lg font-medium">{url}</p>
        <div className="mx-auto my-6 w-fit rounded-2xl bg-white p-4">
          <QRCodeSVG value={url} size={320} className="size-[min(70vw,320px)]" />
        </div>
        <p className="font-display text-7xl font-bold tracking-[0.25em] tabular-nums">{code}</p>
        <Button className="mt-6" variant="secondary" onClick={() => setProjecting(false)}>
          Close
        </Button>
      </Modal>
    </Card>
  )
}
