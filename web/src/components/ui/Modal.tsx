import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
}

export function Modal({ open, onClose, label, className = '', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`m-auto w-[calc(100%-2rem)] animate-pop-in rounded-2xl border border-line bg-surface p-6 text-fg shadow-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm ${className}`}
    >
      {open && children}
    </dialog>
  )
}
