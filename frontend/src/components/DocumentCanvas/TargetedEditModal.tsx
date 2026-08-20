import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePaper } from '../../state/PaperContext'

interface TargetedEditModalProps {
  qId: string
  open: boolean
  onClose: () => void
}

export function TargetedEditModal({ qId, open, onClose }: TargetedEditModalProps) {
  const { runTargetedEdit, generating } = usePaper()
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (!open) setPrompt('')
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    await runTargetedEdit(qId, prompt.trim())
    setPrompt('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Edit question {qId}</DialogTitle>
          <DialogDescription>
            Describe how to change only this question. The rest of the paper stays untouched.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="targeted-edit-prompt" className="text-xs text-muted-foreground">
              Edit instruction
            </Label>
            <Textarea
              id="targeted-edit-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Make this harder" or "Add a numerical part"'
              rows={4}
              autoFocus
              className="min-h-24 [field-sizing:fixed] resize-none text-sm"
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Shortcut: <kbd className="font-sans">⌘K</kbd> / <kbd className="font-sans">Ctrl+K</kbd>
            </p>
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={generating}>
                Cancel
              </Button>
              <Button type="submit" disabled={generating || !prompt.trim()} className="min-w-[7rem]">
                {generating && <Loader2 className="animate-spin" />}
                {generating ? 'Applying…' : 'Apply edit'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
