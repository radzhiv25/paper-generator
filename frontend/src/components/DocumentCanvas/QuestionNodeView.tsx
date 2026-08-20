import type { NodeViewProps } from '@tiptap/react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  collectQuestionIdsFromDoc,
  currentSectionIdFromSelection,
  nextQuestionIdForSection,
} from '../../editor/paperIds'
import type { Difficulty, QuestionType } from '../../editor/schema'

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'short', label: 'Short' },
  { value: 'long', label: 'Long' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'freeform', label: 'Freeform' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

function stopEditorMouseDown(e: React.MouseEvent) {
  e.stopPropagation()
}

function emitAiEdit(qId: string) {
  window.dispatchEvent(new CustomEvent('paper:ai-edit-question', { detail: { qId } }))
}

export function QuestionNodeView({
  node,
  editor,
  getPos,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const qId = String(node.attrs.qId)
  const type = node.attrs.type as QuestionType
  const marks = Number(node.attrs.marks) || 0
  const difficulty = node.attrs.difficulty as Difficulty
  const options = (node.attrs.options as string[]) ?? []

  const pos = typeof getPos === 'function' ? getPos() : null

  const duplicate = () => {
    if (pos == null) return
    const existing = collectQuestionIdsFromDoc(editor.state.doc)
    const sectionId = currentSectionIdFromSelection(editor.state.doc, pos)
    const newId = nextQuestionIdForSection(sectionId, existing)
    const json = node.toJSON() as { attrs?: Record<string, unknown> }
    editor
      .chain()
      .insertContentAt(pos + node.nodeSize, {
        ...json,
        attrs: { ...node.attrs, qId: newId },
      })
      .focus()
      .run()
  }

  const move = (dir: -1 | 1) => {
    if (pos == null) return
    editor.chain().focus().setTextSelection(pos + 1).moveQuestion(dir).run()
  }

  const remove = () => {
    const currentPos = typeof getPos === 'function' ? getPos() : undefined
    if (currentPos == null) return
    editor.chain().focus().deleteQuestion(currentPos).run()
  }

  return (
    <NodeViewWrapper
      className={`question-node ${selected ? 'is-selected' : ''}`}
      data-type="question"
      data-q-id={qId}
    >
      <div
        className="question-chrome"
        contentEditable={false}
        onMouseDown={stopEditorMouseDown}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-gray-200">{qId}.</span>
          <label className="sr-only" htmlFor={`marks-${qId}`}>
            Marks
          </label>
          <input
            id={`marks-${qId}`}
            type="number"
            min={0}
            className="question-chrome-input w-12"
            value={marks}
            onChange={(e) => updateAttributes({ marks: Number(e.target.value) || 0 })}
          />
          <span className="text-[0.65rem] text-muted-foreground">marks</span>

          <Select
            value={type}
            onValueChange={(value) => {
              if (value) updateAttributes({ type: value })
            }}
          >
            <SelectTrigger
              size="sm"
              className="question-chrome-select h-6 w-[5.5rem] gap-1 px-2 text-[11px] font-normal"
              onMouseDown={stopEditorMouseDown}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={difficulty}
            onValueChange={(value) => {
              if (value) updateAttributes({ difficulty: value })
            }}
          >
            <SelectTrigger
              size="sm"
              className="question-chrome-select h-6 w-[5.25rem] gap-1 px-2 text-[11px] font-normal"
              onMouseDown={stopEditorMouseDown}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="question-chrome-actions flex shrink-0 items-center gap-0.5">
          <button type="button" className="question-chrome-btn" title="Move up" onClick={() => move(-1)}>
            <ChevronUp className="size-3.5" />
          </button>
          <button type="button" className="question-chrome-btn" title="Move down" onClick={() => move(1)}>
            <ChevronDown className="size-3.5" />
          </button>
          <button type="button" className="question-chrome-btn" title="Duplicate" onClick={duplicate}>
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            className="question-chrome-btn question-chrome-btn-ai"
            title="AI edit (⌘K)"
            onClick={() => emitAiEdit(qId)}
          >
            <Sparkles className="size-3.5" />
          </button>
          <button
            type="button"
            className="question-chrome-btn text-destructive"
            title="Delete"
            onMouseDown={stopEditorMouseDown}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              remove()
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <NodeViewContent className="question-body" />
      {options.length > 0 && (
        <ul className="mcq-options mt-2 ml-6 list-disc text-sm" contentEditable={false}>
          {options.map((opt) => (
            <li key={opt}>{opt}</li>
          ))}
        </ul>
      )}
    </NodeViewWrapper>
  )
}
