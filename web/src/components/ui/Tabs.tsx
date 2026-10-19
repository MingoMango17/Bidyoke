import type { KeyboardEvent, ReactNode } from 'react'
import { panelId, tabId } from './tabIds'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: ReactNode
  badge?: number
}

interface Props<T extends string> {
  tabs: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  idPrefix: string
  label: string
  variant?: 'pill' | 'bar'
}

export function Tabs<T extends string>({ tabs, value, onChange, idPrefix, label, variant = 'pill' }: Props<T>) {
  function onKeyDown(event: KeyboardEvent) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const index = tabs.findIndex((t) => t.id === value)
    const next = tabs[(index + step + tabs.length) % tabs.length]
    onChange(next.id)
    document.getElementById(tabId(idPrefix, next.id))?.focus()
  }

  const bar = variant === 'bar'
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={bar ? 'grid auto-cols-fr grid-flow-col' : 'flex gap-1 rounded-xl bg-surface-2 p-1'}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value
        const style = bar
          ? `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${selected ? 'text-brand' : 'text-muted'}`
          : `flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`
        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={style}
          >
            {tab.icon}
            <span>
              {tab.label}
              {tab.badge !== undefined && <span className="ml-1 text-muted">({tab.badge})</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
