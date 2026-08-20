import { useState } from 'react'
import { ChevronDown, Check, Loader2, Settings2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Paper } from '../../editor/schema'
import { cn } from '@/lib/utils'

interface DocumentHeaderProps {
  paper: Paper
  saving: boolean
  onMetadataChange: (field: keyof Paper['metadata'], value: string | number) => void
}

export function DocumentHeader({ paper, saving, onMetadataChange }: DocumentHeaderProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <header className="doc-header shrink-0 bg-white">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={paper.metadata.subject}
            onChange={(e) => onMetadataChange('subject', e.target.value)}
            placeholder="Untitled paper"
            className="doc-title-input w-full truncate bg-transparent text-lg font-normal text-[#202124] outline-none placeholder:text-muted-foreground"
            aria-label="Document title"
          />
          <p className="mt-0.5 text-xs text-muted-foreground">
            {paper.metadata.grade_class || 'Class'}
            {paper.metadata.total_marks > 0 && ` · ${paper.metadata.total_marks} marks`}
            {paper.metadata.duration && ` · ${paper.metadata.duration}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="size-3 text-green-600" />
                Saved to cloud
              </>
            )}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setDetailsOpen((o) => !o)}
          >
            <Settings2 className="size-3.5" />
            Details
            <ChevronDown
              className={cn('size-3.5 transition-transform', detailsOpen && 'rotate-180')}
            />
          </Button>
        </div>
      </div>

      {detailsOpen && (
        <div className="border-t border-border bg-[#fafbfc] px-4 py-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="meta-class" className="text-xs text-muted-foreground">
                Class / Grade
              </Label>
              <Input
                id="meta-class"
                value={paper.metadata.grade_class}
                onChange={(e) => onMetadataChange('grade_class', e.target.value)}
                className="h-8 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-marks" className="text-xs text-muted-foreground">
                Total marks
              </Label>
              <Input
                id="meta-marks"
                type="number"
                value={paper.metadata.total_marks}
                onChange={(e) => onMetadataChange('total_marks', Number(e.target.value))}
                className="h-8 w-24"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-duration" className="text-xs text-muted-foreground">
                Duration
              </Label>
              <Input
                id="meta-duration"
                value={paper.metadata.duration}
                onChange={(e) => onMetadataChange('duration', e.target.value)}
                placeholder="e.g. 3 hours"
                className="h-8 w-36"
              />
            </div>
            <div className="space-y-1 min-w-[12rem] flex-1">
              <Label htmlFor="meta-instructions" className="text-xs text-muted-foreground">
                General instructions
              </Label>
              <Input
                id="meta-instructions"
                value={paper.metadata.instructions ?? ''}
                onChange={(e) => onMetadataChange('instructions', e.target.value)}
                placeholder="Optional paper-wide instructions"
                className="h-8"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
