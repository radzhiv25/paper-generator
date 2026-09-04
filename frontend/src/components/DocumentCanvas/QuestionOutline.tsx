import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface QuestionOutlineProps {
  editor: Editor | null
  selectedQId: string | null
  onSelect: (qId: string) => void
  onAiEdit: (qId: string) => void
}

export function QuestionOutline({ editor, selectedQId, onSelect, onAiEdit }: QuestionOutlineProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const bump = () => setTick((t) => t + 1)
    editor.on('update', bump)
    editor.on('selectionUpdate', bump)
    return () => {
      editor.off('update', bump)
      editor.off('selectionUpdate', bump)
    }
  }, [editor])

  const items: { qId: string; marks: number }[] = []
  editor?.state.doc.descendants((node) => {
    if (node.type.name === 'question') {
      items.push({ qId: String(node.attrs.qId), marks: Number(node.attrs.marks) || 0 })
    }
  })

  if (items.length === 0) return null

  return (
    <aside className="question-outline hidden w-40 shrink-0 flex-col overflow-hidden border-r border-border bg-white/90 xl:flex dark:bg-[#1e1f23]">
      <div className="flex-1 overflow-auto p-2 text-xs">
      <p className="mb-2 px-1 font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.qId}>
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted ${
                selectedQId === item.qId ? 'bg-brand-50 text-brand-700' : ''
              }`}
              onClick={() => {
                onSelect(item.qId)
                const el = document.querySelector(`[data-q-id="${item.qId}"]`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              onDoubleClick={() => onAiEdit(item.qId)}
            >
              <span className="font-medium">{item.qId}</span>
              <span className="text-muted-foreground">{item.marks}m</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 px-1 text-[0.65rem] leading-snug text-muted-foreground">
        Double-click to AI-edit. ⌘K on a selected question.
      </p>
      </div>
    </aside>
  )
}
