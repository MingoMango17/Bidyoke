import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export function Layout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className={`mx-auto flex min-h-dvh flex-col px-4 ${wide ? 'max-w-7xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between py-3">
          <Link to="/" aria-label="Bidyoke home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 flex-col gap-5 pb-10 pt-2">{children}</main>
      </div>
    </div>
  )
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`animate-fade-in rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

export const inputClass =
  'w-full min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-base text-fg placeholder:text-muted/70 outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

export function ErrorText({ message }: { message: string | undefined }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  )
}
