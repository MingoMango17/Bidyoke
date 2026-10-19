import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  body?: string
}

export function EmptyState({ icon: Icon, title, body }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
    </div>
  )
}
