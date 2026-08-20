import { useEffect, useState } from 'react'
import { FileText, Loader2, Sparkles } from 'lucide-react'

const STEPS = [
  'Reading your prompt…',
  'Crafting questions…',
  'Building sections…',
  'Writing answer key…',
  'Formatting the paper…',
]

interface GeneratingOverlayProps {
  modelName?: string
  provider?: string
  phase?: string
  serverElapsed?: number
}

const PHASE_LABELS: Record<string, string> = {
  starting: 'Starting generation…',
  llm: 'Calling Ollama model…',
  saving: 'Saving your paper…',
}

export function GeneratingOverlay({
  modelName,
  provider,
  phase,
  serverElapsed,
}: GeneratingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length)
    }, 4000)
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1)
    }, 1000)
    return () => {
      clearInterval(stepTimer)
      clearInterval(elapsedTimer)
    }
  }, [])

  const providerLabel =
    provider === 'local'
      ? `Ollama · ${modelName ?? 'local model'}`
      : modelName ?? 'AI model'

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center px-6 text-center">
        <div className="generating-paper relative mb-6">
          <div className="generating-paper__sheet generating-paper__sheet--back" />
          <div className="generating-paper__sheet generating-paper__sheet--mid" />
          <div className="generating-paper__sheet generating-paper__sheet--front">
            <FileText className="generating-paper__icon text-brand-600" strokeWidth={1.5} />
            <div className="generating-paper__lines">
              <span className="generating-paper__line generating-paper__line--1" />
              <span className="generating-paper__line generating-paper__line--2" />
              <span className="generating-paper__line generating-paper__line--3" />
              <span className="generating-paper__line generating-paper__line--4" />
              <span className="generating-paper__line generating-paper__line--5" />
            </div>
          </div>
          <Sparkles className="generating-paper__sparkle generating-paper__sparkle--1 size-4 text-brand-500" />
          <Sparkles className="generating-paper__sparkle generating-paper__sparkle--2 size-3 text-brand-400" />
        </div>

        <h3 className="text-base font-semibold text-gray-900">Generating your paper</h3>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {(phase && PHASE_LABELS[phase]) || STEPS[stepIndex]}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{providerLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {(() => {
            const secs = serverElapsed ?? elapsed
            if (secs < 30) return 'Usually takes 1–3 minutes with cloud Ollama models'
            if (secs < 120) return `${secs}s — Ollama is generating, please wait…`
            return `${secs}s — still working. Try llama3.2:3b in backend/.env for faster results.`
          })()}
        </p>
      </div>
    </div>
  )
}
