export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive'
export type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover',
  secondary: 'border border-line bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-danger/40 text-danger hover:bg-danger-soft',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4',
  lg: 'min-h-12 px-6 text-lg',
  icon: 'size-10',
}

export interface StyleOptions {
  variant?: Variant
  size?: Size
  block?: boolean
}

export function buttonStyles({ variant = 'primary', size = 'md', block = false }: StyleOptions = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''}`
}
