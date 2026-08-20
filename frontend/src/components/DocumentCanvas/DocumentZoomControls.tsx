import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5]

interface DocumentZoomControlsProps {
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function DocumentZoomControls({ zoom, onZoomChange }: DocumentZoomControlsProps) {
  const stepDown = () => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001)
    const next = Math.max(0, (idx === -1 ? ZOOM_STEPS.length - 1 : idx) - 1)
    onZoomChange(ZOOM_STEPS[next])
  }

  const stepUp = () => {
    const idx = ZOOM_STEPS.findIndex((z) => z > zoom + 0.001)
    const next = idx === -1 ? ZOOM_STEPS.length - 1 : idx
    onZoomChange(ZOOM_STEPS[next])
  }

  const fit = () => onZoomChange(1)

  return (
    <div className="doc-zoom-controls pointer-events-auto flex items-center gap-0.5 rounded-lg border border-border bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="doc-toolbar-btn size-7 shrink-0 transition-colors"
        title="Zoom out"
        onClick={stepDown}
      >
        <Minus className="size-3.5" />
      </Button>
      <button
        type="button"
        className="doc-toolbar-btn w-10 shrink-0 px-1 text-center text-xs tabular-nums text-muted-foreground hover:text-foreground"
        onClick={fit}
        title="Reset zoom to 100%"
      >
        {`${Math.round(zoom * 100)}%`}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="doc-toolbar-btn size-7 shrink-0 transition-colors"
        title="Zoom in"
        onClick={stepUp}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}
