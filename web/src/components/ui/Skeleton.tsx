export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-2 ${className}`} />
}

export function SongRowSkeleton() {
  return (
    <li aria-hidden className="flex items-center gap-3 py-2">
      <Skeleton className="size-14 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </li>
  )
}
