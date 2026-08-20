import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExportFormat, ExportInclude } from '../../editor/schema'
import { exportPaper } from '../../api/papers'
import { usePaper } from '../../state/PaperContext'
import { cn } from '@/lib/utils'

export function ExportBar() {
  const { paper } = usePaper()
  const [format, setFormat] = useState<ExportFormat>('docx')
  const [include, setInclude] = useState<ExportInclude>('paper')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!paper) return
    setExporting(true)
    try {
      const blob = await exportPaper(paper.paper_id, { format, include })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${paper.metadata.subject || 'paper'}-${include}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!paper) return null

  const toggleClass = (active: boolean) =>
    cn(
      'rounded-md px-3 py-1 text-xs transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
    )

  return (
    <div className="flex h-11 shrink-0 items-center gap-4 border-t border-border bg-muted/50 px-4">
      <span className="text-sm font-medium">Export</span>

      <div className="flex rounded-lg border border-border bg-background p-0.5">
        {(['docx', 'pdf'] as ExportFormat[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={toggleClass(format === f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex rounded-lg border border-border bg-background p-0.5">
        {(
          [
            { value: 'paper', label: 'Paper' },
            { value: 'answer_key', label: 'Answer Key' },
            { value: 'both', label: 'Both' },
          ] as { value: ExportInclude; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setInclude(opt.value)}
            className={toggleClass(include === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting}
        className="ml-auto"
      >
        {exporting ? <Loader2 className="animate-spin" /> : <Download />}
        {exporting ? 'Exporting…' : 'Download'}
      </Button>
    </div>
  )
}
