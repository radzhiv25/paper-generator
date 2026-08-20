import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import { Loader2 } from 'lucide-react'
import TextAlign from '@tiptap/extension-text-align'
import type { Paper } from '../../editor/schema'
import {
  ChemNotationNode,
  EquationNode,
  FontSize,
  LineHeight,
  QuestionNode,
  SectionNode,
  SelectedQuestionHighlight,
} from '../../editor/extensions'
import { paperToTipTapContent } from '../../editor/paperToTipTap'
import { tipTapToPaper } from '../../editor/tipTapToPaper'
import { usePaper } from '../../state/PaperContext'
import { EditorToolbar } from './EditorToolbar'
import { EditorBubbleMenu } from './EditorBubbleMenu'
import { DocumentHeader } from './DocumentHeader'
import { DocumentStatusBar } from './DocumentStatusBar'
import { TargetedEditModal } from './TargetedEditModal'
import { QuestionOutline } from './QuestionOutline'

const PaperDocument = Document.extend({
  content: 'section+',
})

interface DocumentCanvasProps {
  paper: Paper
}

export function DocumentCanvas({ paper }: DocumentCanvasProps) {
  const {
    autosavePaper,
    registerEditorFlush,
    paperSyncKey,
    viewMode,
    selectedQId,
    setSelectedQId,
    saving,
  } = usePaper()
  const paperRef = useRef(paper)
  const canAutosaveRef = useRef(false)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appliedSyncKeyRef = useRef(paperSyncKey)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editQId, setEditQId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const selectedQIdRef = useRef(selectedQId)

  paperRef.current = paper
  selectedQIdRef.current = selectedQId

  const openEditModal = useCallback(
    (qId: string) => {
      setEditQId(qId)
      setEditModalOpen(true)
      setSelectedQId(qId)
    },
    [setSelectedQId],
  )

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false)
    setEditQId(null)
  }, [])

  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const flushEditorNow = useCallback((): Paper | null => {
    const ed = editorRef.current
    if (!ed) return null
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }
    const updated = tipTapToPaper(ed, paperRef.current)
    const hadQuestions = paperRef.current.sections.some((s) => s.questions.length > 0)
    const hasQuestions = updated.sections.some((s) => s.questions.length > 0)
    if (hadQuestions && !hasQuestions) return paperRef.current
    paperRef.current = updated
    return updated
  }, [])

  const editor = useEditor({
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        document: false,
        heading: { levels: [1, 2, 3] },
        blockquote: {},
        horizontalRule: {},
        bulletList: {},
        orderedList: {},
        codeBlock: false,
      }),
      PaperDocument,
      SectionNode,
      QuestionNode,
      EquationNode,
      ChemNotationNode,
      Underline,
      TextStyle,
      FontSize,
      LineHeight,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'doc-link' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      SelectedQuestionHighlight,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'paragraph') {
            return 'Type your question here…'
          }
          return ''
        },
        showOnlyWhenEditable: true,
        includeChildren: true,
      }),
    ],
    content: paperToTipTapContent(paper),
    editorProps: {
      attributes: {
        class: 'tiptap doc-editor-content focus:outline-none',
        spellcheck: 'true',
      },
      scrollThreshold: 120,
      scrollMargin: 80,
    },
    onUpdate: ({ editor: ed }) => {
      if (!canAutosaveRef.current) return
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = setTimeout(() => {
        const updated = tipTapToPaper(ed, paperRef.current)
        const hadQuestions = paperRef.current.sections.some((s) => s.questions.length > 0)
        const hasQuestions = updated.sections.some((s) => s.questions.length > 0)
        if (hadQuestions && !hasQuestions) return
        paperRef.current = updated
        autosavePaper(updated)
      }, 450)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { $from } = ed.state.selection
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth)
        if (node.type.name === 'question') {
          setSelectedQId(String(node.attrs.qId))
          return
        }
      }
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    registerEditorFlush(() => flushEditorNow())
    return () => registerEditorFlush(null)
  }, [registerEditorFlush, flushEditorNow])

  useEffect(() => {
    if (!editor) return
    if (appliedSyncKeyRef.current === paperSyncKey) return
    appliedSyncKeyRef.current = paperSyncKey
    canAutosaveRef.current = false
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }
    const content = paperToTipTapContent(paper)
    editor.commands.setContent(content, { emitUpdate: false })
    paperRef.current = paper
    const frame = requestAnimationFrame(() => {
      canAutosaveRef.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [editor, paperSyncKey, paper])

  useEffect(() => {
    if (viewMode !== 'paper') {
      const flushed = flushEditorNow()
      if (flushed) autosavePaper(flushed)
    }
  }, [viewMode, flushEditorNow, autosavePaper])

  useEffect(() => {
    if (!editor) return
    canAutosaveRef.current = false
    const frame = requestAnimationFrame(() => {
      canAutosaveRef.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [editor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        editor?.chain().focus().insertQuestionAfter().run()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        const previous = editor?.getAttributes('link').href as string | undefined
        const url = window.prompt('Link URL', previous ?? 'https://')
        if (url === null || !editor) return
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const qId = selectedQIdRef.current
        if (qId) openEditModal(qId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openEditModal, editor])

  useEffect(() => {
    const onAi = (e: Event) => {
      const qId = (e as CustomEvent<{ qId: string }>).detail?.qId
      if (qId) openEditModal(qId)
    }
    window.addEventListener('paper:ai-edit-question', onAi)
    return () => window.removeEventListener('paper:ai-edit-question', onAi)
  }, [openEditModal])

  useEffect(() => {
    const onScroll = (e: Event) => {
      const qId = (e as CustomEvent<{ qId: string }>).detail?.qId
      if (!qId) return
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-q-id="${CSS.escape(qId)}"]`)
        el?.classList.add('question-flash')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        window.setTimeout(() => el?.classList.remove('question-flash'), 1600)
      })
    }
    window.addEventListener('paper:scroll-question', onScroll)
    return () => window.removeEventListener('paper:scroll-question', onScroll)
  }, [])

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
      const flushed = flushEditorNow()
      if (flushed) autosavePaper(flushed)
    }
  }, [flushEditorNow, autosavePaper])

  const handleMetadataChange = useCallback(
    (field: keyof Paper['metadata'], value: string | number) => {
      autosavePaper({
        ...paperRef.current,
        metadata: { ...paperRef.current.metadata, [field]: value },
      })
    },
    [autosavePaper],
  )

  const blockCount = paper.sections.reduce((n, s) => n + s.questions.length, 0)

  const focusEditorAtEnd = useCallback(() => {
    editor?.chain().focus('end').run()
  }, [editor])

  return (
    <div className="flex h-full flex-col bg-[#e8eaed]">
      <DocumentHeader
        paper={paper}
        saving={saving}
        onMetadataChange={handleMetadataChange}
      />

      <div className="flex min-h-0 flex-1">
        <QuestionOutline
          editor={editor}
          selectedQId={selectedQId}
          onSelect={setSelectedQId}
          onAiEdit={openEditModal}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {editor && (
            <div className="relative z-30 shrink-0 overflow-visible">
              <EditorToolbar editor={editor} />
            </div>
          )}

          <div
            className="doc-workspace relative min-h-0 flex-1 overflow-auto"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) focusEditorAtEnd()
            }}
          >
            <div
              className="doc-workspace-inner flex min-h-full justify-center p-10 pb-14"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) focusEditorAtEnd()
              }}
            >
              <div
                className="doc-page"
                style={{ zoom: zoom === 1 ? undefined : zoom }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) focusEditorAtEnd()
                }}
              >
                {!editor ? (
                  <div className="flex min-h-[1056px] items-center justify-center gap-2 px-12 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading editor…
                  </div>
                ) : (
                  <>
                    <EditorContent editor={editor} />
                    <EditorBubbleMenu editor={editor} />
                  </>
                )}
              </div>
            </div>
          </div>

          <DocumentStatusBar
            editor={editor}
            questionCount={blockCount}
            selectedQId={selectedQId}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </div>
      </div>

      {editQId && (
        <TargetedEditModal
          qId={editQId}
          open={editModalOpen}
          onClose={closeEditModal}
        />
      )}
    </div>
  )
}
