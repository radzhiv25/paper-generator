import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Layers,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Paintbrush,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, ToolbarGroup } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const FONT_FAMILIES = [
  { label: 'Default', value: 'default', stack: '' },
  { label: 'Times New Roman', value: 'times', stack: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'arial', stack: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'calibri', stack: 'Calibri, "Segoe UI", sans-serif' },
  { label: 'Georgia', value: 'georgia', stack: 'Georgia, serif' },
  { label: 'Sans Serif', value: 'sans', stack: 'system-ui, -apple-system, sans-serif' },
] as const

function fontValueToKey(stack: string | undefined): string {
  if (!stack) return 'default'
  const match = FONT_FAMILIES.find((f) => f.stack === stack)
  return match?.value ?? 'default'
}

const FONT_SIZES = [
  { label: 'Default', value: 'default' },
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '14px' },
  { label: 'Large', value: '18px' },
  { label: 'Huge', value: '24px' },
]

const LINE_HEIGHTS = [
  { label: 'Default', value: 'default' },
  { label: 'Single', value: '1.15' },
  { label: '1.5 lines', value: '1.5' },
  { label: 'Double', value: '2' },
]

const TEXT_COLORS = [
  '#111827',
  '#374151',
  '#6b7280',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
]

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#e9d5ff',
  '#fed7aa',
]

const PARAGRAPH_STYLES = [
  { label: 'Normal text', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
] as const

type ParagraphStyle = (typeof PARAGRAPH_STYLES)[number]['value']

function currentParagraphStyle(editor: Editor): ParagraphStyle {
  if (editor.isActive('heading', { level: 1 })) return 'h1'
  if (editor.isActive('heading', { level: 2 })) return 'h2'
  if (editor.isActive('heading', { level: 3 })) return 'h3'
  return 'paragraph'
}

function applyParagraphStyle(editor: Editor, style: ParagraphStyle) {
  if (style === 'paragraph') {
    editor.chain().focus().setParagraph().run()
    return
  }
  const level = Number(style.slice(1)) as 1 | 2 | 3
  editor.chain().focus().toggleHeading({ level }).run()
}

interface EditorToolbarProps {
  editor: Editor
}

function ToolbarIconButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'doc-toolbar-btn size-7 shrink-0 transition-colors',
          active && 'bg-muted text-foreground',
        )}
      >
        {children}
      </Button>
    </Tooltip>
  )
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [, setRevision] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const textColorRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<HTMLInputElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1)
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor])

  useEffect(() => {
    if (!moreOpen) return
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moreOpen])

  const currentFontFamily = fontValueToKey(
    editor.getAttributes('textStyle').fontFamily as string | undefined,
  )
  const currentFontSize =
    (editor.getAttributes('textStyle').fontSize as string | undefined) ?? 'default'
  const currentLineHeight =
    (editor.getAttributes('paragraph').lineHeight as string | undefined) ??
    (editor.getAttributes('heading').lineHeight as string | undefined) ??
    'default'

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const applyLineHeight = (value: string) => {
    if (value === 'default') {
      editor.chain().focus().unsetLineHeight().run()
      return
    }
    const { $from } = editor.state.selection
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth)
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        editor.chain().focus().updateAttributes(node.type.name, { lineHeight: value }).run()
        return
      }
    }
  }

  return (
    <div className="doc-toolbar flex space-x-2 shrink-0 items-center border-b border-border bg-[#fafbfc] px-2 dark:bg-muted/20">
      <ToolbarGroup>
        <ToolbarIconButton
          label="Add question"
          shortcut="⌘⇧Q"
          onClick={() => editor.chain().focus().insertQuestionAfter().run()}
        >
          <Plus className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Add section"
          onClick={() => editor.chain().focus().insertSectionAtEnd().run()}
        >
          <Layers className="size-3.5" />
        </ToolbarIconButton>
      </ToolbarGroup>

      {/* <Separator orientation="vertical" className="mx-0.5 h-6 shrink-0" /> */}

      <ToolbarGroup>
        <ToolbarIconButton
          label="Undo"
          shortcut="⌘Z"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Redo"
          shortcut="⌘⇧Z"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-3.5" />
        </ToolbarIconButton>
      </ToolbarGroup>

      {/* <Separator orientation="vertical" className="mx-0.5 h-6 shrink-0" /> */}

      <ToolbarGroup>
        <Tooltip label="Paragraph style">
          <Select
            value={currentParagraphStyle(editor)}
            onValueChange={(value) => {
              if (value) applyParagraphStyle(editor, value as ParagraphStyle)
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-[5.75rem] shrink-0 gap-1 px-2 text-[11px]">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {PARAGRAPH_STYLES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Tooltip>

        <Tooltip label="Font family">
          <Select
            value={currentFontFamily}
            onValueChange={(value) => {
              if (!value || value === 'default') editor.chain().focus().unsetFontFamily().run()
              else {
                const stack = FONT_FAMILIES.find((f) => f.value === value)?.stack
                if (stack) editor.chain().focus().setFontFamily(stack).run()
              }
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-[5.5rem] shrink-0 gap-1 px-2 text-[11px]">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span style={{ fontFamily: opt.stack || 'inherit' }}>{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Tooltip>

        <Tooltip label="Font size">
          <Select
            value={currentFontSize}
            onValueChange={(value) => {
              if (!value || value === 'default') editor.chain().focus().unsetFontSize().run()
              else editor.chain().focus().setFontSize(value).run()
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-[4.25rem] shrink-0 gap-1 px-2 text-[11px]">
              <Type className="size-3 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Tooltip>

        <Tooltip label="Line spacing">
          <Select
            value={currentLineHeight}
            onValueChange={(value) => {
              if (!value || value === 'default') applyLineHeight('default')
              else applyLineHeight(value)
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-[5rem] shrink-0 gap-1 px-2 text-[11px]">
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {LINE_HEIGHTS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Tooltip>
      </ToolbarGroup>

      {/* <Separator orientation="vertical" className="mx-0.5 h-6 shrink-0" /> */}

      <ToolbarGroup>
        <ToolbarIconButton
          label="Bold"
          shortcut="⌘B"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Italic"
          shortcut="⌘I"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Underline"
          shortcut="⌘U"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarIconButton>

        <div className="relative">
          <ToolbarIconButton
            label="Text color"
            onClick={() => textColorRef.current?.click()}
          >
            <span className="flex flex-col items-center leading-none">
              <Type className="size-3.5" />
              <span
                className="mt-0.5 h-0.5 w-4 rounded-full"
                style={{
                  background:
                    (editor.getAttributes('textStyle').color as string | undefined) ??
                    '#111827',
                }}
              />
            </span>
          </ToolbarIconButton>
          <input
            ref={textColorRef}
            type="color"
            className="sr-only"
            value={
              (editor.getAttributes('textStyle').color as string | undefined) ?? '#111827'
            }
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </div>

        <div className="relative">
          <ToolbarIconButton
            label="Highlight"
            active={editor.isActive('highlight')}
            onClick={() => highlightRef.current?.click()}
          >
            <Paintbrush className="size-3.5" />
          </ToolbarIconButton>
          <input
            ref={highlightRef}
            type="color"
            className="sr-only"
            value={
              (editor.getAttributes('highlight').color as string | undefined) ?? '#fef08a'
            }
            onChange={(e) =>
              editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
            }
          />
        </div>

        <ToolbarIconButton
          label="Insert link"
          shortcut="⌘⇧L"
          active={editor.isActive('link')}
          onClick={setLink}
        >
          <Link2 className="size-3.5" />
        </ToolbarIconButton>
      </ToolbarGroup>

      {/* <Separator orientation="vertical" className="mx-0.5 h-6 shrink-0" /> */}

      <ToolbarGroup>
        <ToolbarIconButton
          label="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Justify"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="size-3.5" />
        </ToolbarIconButton>
      </ToolbarGroup>

      {/* <Separator orientation="vertical" className="mx-0.5 h-6 shrink-0" /> */}

      <ToolbarGroup>
        <ToolbarIconButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarIconButton>

        <div className="relative" ref={moreRef}>
          <ToolbarIconButton label="More options" onClick={() => setMoreOpen((o) => !o)}>
            <MoreHorizontal className="size-3.5" />
          </ToolbarIconButton>
          {moreOpen && (
            <div className="absolute top-full right-0 z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-md">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => {
                  editor.chain().focus().setParagraph().run()
                  setMoreOpen(false)
                }}
              >
                <Pilcrow className="size-4" />
                Normal text
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => {
                  editor.chain().focus().setHorizontalRule().run()
                  setMoreOpen(false)
                }}
              >
                <Minus className="size-4" />
                Horizontal rule
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => {
                  editor.chain().focus().unsetAllMarks().clearNodes().run()
                  setMoreOpen(false)
                }}
              >
                <RemoveFormatting className="size-4" />
                Clear formatting
              </button>
              <div className="my-1 border-t border-border" />
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Text color
              </p>
              <div className="flex flex-wrap gap-1 px-2 pb-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    className="size-5 rounded border border-border"
                    style={{ background: color }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run()
                      setMoreOpen(false)
                    }}
                  />
                ))}
              </div>
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Highlight
              </p>
              <div className="flex flex-wrap gap-1 px-2 pb-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    className="size-5 rounded border border-border"
                    style={{ background: color }}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color }).run()
                      setMoreOpen(false)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ToolbarGroup>
    </div>
  )
}
