import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GeneratingOverlayProps {
  modelName?: string
  provider?: string
  phase?: string // 'starting' | 'llm' | 'saving'
  serverElapsed?: number
}

const STATUS_STEPS = [
  'Reading your prompt…',
  'Designing question structure…',
  'Writing MCQs…',
  'Crafting short answer questions…',
  'Writing answer key…',
  'Formatting paper…',
]

const PHASE_STEPS = [
  { label: 'Thinking' },
  { label: 'Crafting Questions' },
  { label: 'Building Paper' },
  { label: 'Finalizing' },
]

const FAKE_QUESTIONS = [
  { label: 'Q1.', line1Width: 'w-full', line2Width: 'w-4/5' },
  { label: 'Q2.', line1Width: 'w-11/12', line2Width: 'w-3/4' },
  { label: 'Q3.', line1Width: 'w-full', line2Width: 'w-5/6' },
  { label: 'Q4.', line1Width: 'w-10/12', line2Width: 'w-2/3' },
]

function ProgressBar({ elapsed }: { elapsed: number }) {
  const raw = Math.min(elapsed / 90, 1)
  const pct = 95 * (1 - Math.pow(1 - raw, 2.5))
  return (
    <div className="absolute left-0 right-0 top-0 h-[3px] bg-slate-800/60">
      <div
        className="h-full transition-all duration-1000 ease-out"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
          boxShadow: '0 0 8px rgba(139,92,246,0.7)',
        }}
      />
    </div>
  )
}

function PhaseChip({ label, state }: { label: string; state: 'active' | 'done' | 'future' }) {
  return (
    <div
      className={[
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-500',
        state === 'active'
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
          : state === 'done'
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-slate-800/60 text-slate-500',
      ].join(' ')}
    >
      <span className={state === 'active' ? 'animate-pulse text-[10px]' : 'text-[10px]'}>✦</span>
      {label}
    </div>
  )
}

function ShimmerLine({ width, delay = 0 }: { width: string; delay?: number }) {
  return (
    <div
      className={`shimmer-line h-2.5 rounded-full ${width}`}
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

function QuestionBlock({
  q,
  index,
  isLast,
}: {
  q: (typeof FAKE_QUESTIONS)[0]
  index: number
  isLast: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 + index * 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-2"
    >
      <span className="text-xs font-bold text-slate-700">{q.label}</span>
      <div className="flex flex-col gap-1.5">
        <ShimmerLine width={q.line1Width} delay={index * 0.15} />
        <div className="flex items-center gap-1">
          <ShimmerLine width={q.line2Width} delay={index * 0.15 + 0.1} />
          {isLast && (
            <span className="inline-block h-3 w-px animate-[cursor-blink_1s_step-end_infinite] bg-indigo-500" />
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function GeneratingOverlay({ modelName, provider, phase, serverElapsed }: GeneratingOverlayProps) {
  const [statusIndex, setStatusIndex] = useState(0)
  const [showStatus, setShowStatus] = useState(true)
  const [clientElapsed, setClientElapsed] = useState(0)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setShowStatus(false)
      const fadeIn = setTimeout(() => {
        setStatusIndex((i) => (i + 1) % STATUS_STEPS.length)
        setShowStatus(true)
      }, 300)
      return () => clearTimeout(fadeIn)
    }, 3500)
    return () => clearInterval(cycleTimer)
  }, [])

  useEffect(() => {
    startTimeRef.current = Date.now()
    const t = setInterval(() => {
      setClientElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = serverElapsed ?? clientElapsed

  const activeCount = (() => {
    if (!phase || phase === 'starting') return 2
    if (phase === 'llm') return 3
    if (phase === 'saving') return 4
    return 2
  })()

  const getChipState = (idx: number): 'active' | 'done' | 'future' => {
    if (idx >= activeCount) return 'future'
    if (idx === activeCount - 1) return 'active'
    return 'done'
  }

  const providerLabel =
    provider === 'local' ? `Ollama · ${modelName ?? 'local model'}` : (modelName ?? 'AI model')

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <ProgressBar elapsed={elapsed} />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex w-full max-w-lg flex-col items-center gap-6 px-6">
        {/* Phase chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {PHASE_STEPS.map((step, i) => (
            <PhaseChip key={step.label} label={step.label} state={getChipState(i)} />
          ))}
        </div>

        {/* Paper preview card */}
        <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
          <div
            className="h-1.5 w-full"
            style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' }}
          />
          <div className="px-6 pb-6 pt-5">
            <div className="mb-5 flex flex-col items-center gap-2">
              <ShimmerLine width="w-2/3" />
              <ShimmerLine width="w-1/2" />
            </div>
            <div className="flex flex-col gap-5">
              {FAKE_QUESTIONS.map((q, i) => (
                <QuestionBlock key={q.label} q={q} index={i} isLast={i === FAKE_QUESTIONS.length - 1} />
              ))}
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-xs font-medium text-slate-400">{providerLabel}</p>
          <AnimatePresence mode="wait">
            {showStatus && (
              <motion.p
                key={statusIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-sm font-medium text-slate-200"
              >
                {STATUS_STEPS[statusIndex]}
              </motion.p>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {elapsed >= 10 && (
              <motion.p
                key="elapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-slate-500"
              >
                {elapsed}s elapsed
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
