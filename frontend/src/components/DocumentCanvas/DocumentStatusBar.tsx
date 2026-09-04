import type { Editor } from '@tiptap/react'
import { DocumentZoomControls } from './DocumentZoomControls'

interface DocumentStatusBarProps {
  editor: Editor | null
  questionCount: number
  selectedQId: string | null
  zoom: number
  onZoomChange: (zoom: number) => void
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function DocumentStatusBar({
  editor,
  questionCount,
  selectedQId,
  zoom,
  onZoomChange,
}: DocumentStatusBarProps) {
  const text = editor?.state.doc.textContent ?? ''
  const words = countWords(text)
  const chars = text.length

  return (
    <footer className="doc-status-bar flex h-9 shrink-0 items-center justify-between border-t border-border bg-white px-4 text-xs text-muted-foreground dark:bg-[#1e1f23]">
      <div className="flex items-center gap-3">
        <span>
          {words} word{words === 1 ? '' : 's'}
        </span>
        <span className="text-border">|</span>
        <span>
          {chars} character{chars === 1 ? '' : 's'}
        </span>
        <span className="text-border">|</span>
        <span>
          {questionCount} question{questionCount === 1 ? '' : 's'}
        </span>
        {selectedQId && (
          <>
            <span className="text-border">|</span>
            <span className="text-brand-600">
              {selectedQId} selected · ⌘K to AI-edit
            </span>
          </>
        )}
      </div>

      <DocumentZoomControls zoom={zoom} onZoomChange={onZoomChange} />
    </footer>
  )
}
