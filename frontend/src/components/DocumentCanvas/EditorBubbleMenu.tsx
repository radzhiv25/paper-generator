import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { EditorState } from '@tiptap/pm/state'
import {
  Bold,
  Italic,
  Link2,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface EditorBubbleMenuProps {
  editor: Editor
}

function BubbleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      onClick={onClick}
      className={cn(
        'doc-toolbar-btn size-8 shrink-0 text-white hover:bg-white/15 hover:text-white',
        active && 'bg-white/20',
      )}
    >
      {children}
    </Button>
  )
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus()
  }, [linkOpen])

  const openLinkEditor = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    setLinkUrl(previous ?? '')
    setLinkOpen(true)
  }

  const applyLink = () => {
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'top',
        onHide: () => setLinkOpen(false),
      }}
      shouldShow={({
        editor: ed,
        state,
      }: {
        editor: Editor
        state: EditorState
      }) => {
        const { empty } = state.selection
        if (empty) return false
        if (ed.isActive('question') && state.selection.from === state.selection.to) {
          return false
        }
        return true
      }}
      className="doc-bubble-menu flex items-center gap-0.5 rounded-lg border border-gray-700/50 bg-gray-900 px-1 py-1 shadow-xl"
    >
      {linkOpen ? (
        <form
          className="flex items-center gap-1.5 px-1"
          onSubmit={(e) => {
            e.preventDefault()
            applyLink()
          }}
        >
          <Input
            ref={linkInputRef}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Paste or type a link"
            className="h-7 w-52 border-gray-600 bg-gray-800 text-xs text-white placeholder:text-gray-400"
          />
          <Button
            type="submit"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              setLinkOpen(false)
            }}
          >
            Remove
          </Button>
        </form>
      ) : (
        <>
          <BubbleButton
            label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </BubbleButton>
          <BubbleButton
            label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </BubbleButton>
          <BubbleButton
            label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline className="size-4" />
          </BubbleButton>
          <BubbleButton
            label="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </BubbleButton>
          <span className="mx-0.5 h-5 w-px bg-white/20" />
          <BubbleButton
            label="Insert link"
            active={editor.isActive('link')}
            onClick={openLinkEditor}
          >
            <Link2 className="size-4" />
          </BubbleButton>
        </>
      )}
    </BubbleMenu>
  )
}
