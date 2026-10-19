import { Mic } from 'lucide-react'

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm ${className}`}
    >
      <Mic className="size-[55%]" aria-hidden />
    </span>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight">Bidyoke</span>
    </span>
  )
}
