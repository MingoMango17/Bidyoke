import { Button } from './Button'
import { Modal } from './Modal'

interface Props {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} label={title} className="max-w-sm">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onConfirm()
            onCancel()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
