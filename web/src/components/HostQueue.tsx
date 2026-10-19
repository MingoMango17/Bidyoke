import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ListMusic, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Command, type QueueItem, type SessionState } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { SongRow } from './SongRow'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'

interface Props {
  state: SessionState
  send: SessionApi['send']
}

interface RowProps {
  item: QueueItem
  note: string
  onRemove: () => void
}

function SortableRow({ item, note, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.itemId,
  })
  return (
    <SongRow
      song={item.song}
      note={note}
      rowProps={{
        ref: setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        className: `bg-surface ${isDragging ? 'relative z-10 rounded-lg shadow-lg' : ''}`,
      }}
      leading={
        <button
          ref={setActivatorNodeRef}
          aria-label={`Reorder ${item.song.title}`}
          className="-mx-1 grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:bg-surface-2 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
      }
      action={
        <Button variant="ghost" size="icon" aria-label={`Remove ${item.song.title}`} onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      }
    />
  )
}

export function HostQueue({ state, send }: Props) {
  const [reordered, setReordered] = useState<{ rev: number; items: QueueItem[] }>()
  const items = reordered?.rev === state.rev ? reordered.items : state.queue
  const nameOf = (id: string) => state.members.find((m) => m.memberId === id)?.name ?? 'Someone'
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.itemId === active.id)
    const to = items.findIndex((i) => i.itemId === over.id)
    setReordered({ rev: state.rev, items: arrayMove(items, from, to) })
    send(Command.QueueMove, { itemId: String(active.id), toIndex: to })
  }

  if (items.length === 0) {
    return <EmptyState icon={ListMusic} title="The queue is empty" body="Guests can add songs once they join." />
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.itemId)} strategy={verticalListSortingStrategy}>
        <ol className="divide-y divide-line">
          {items.map((item) => (
            <SortableRow
              key={item.itemId}
              item={item}
              note={nameOf(item.addedBy)}
              onRemove={() => send(Command.QueueRemove, { itemId: item.itemId })}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
