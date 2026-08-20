import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AnswerKey, Paper } from '../editor/schema'
import type { HealthInfo } from '../api/health'
import { fetchHealth } from '../api/health'
import {
  attachPaperContext,
  generatePaper,
  getAnswerKey,
  getPaper,
  regenerateQuestion,
  saveAnswerKey,
  savePaper,
} from '../api/papers'
import { ApiError } from '../api/client'

function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: string } | undefined
    if (typeof body?.detail === 'string') return body.detail
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Generation failed'
}

type ViewMode = 'paper' | 'answer_key'

interface PaperContextValue {
  paper: Paper | null
  answerKey: AnswerKey | null
  loading: boolean
  saving: boolean
  generating: boolean
  generateError: string | null
  generationPhase: string | null
  generationElapsed: number
  viewMode: ViewMode
  selectedQId: string | null
  marksMismatch: boolean
  llmInfo: HealthInfo | null
  paperSyncKey: number
  generatePollTick: number
  setViewMode: (mode: ViewMode) => void
  setSelectedQId: (qId: string | null) => void
  loadPaper: (paperId: string) => Promise<void>
  updatePaper: (paper: Paper) => void
  updateAnswerKey: (key: AnswerKey) => void
  autosavePaper: (paper: Paper) => void
  flushEditorToPaper: () => Promise<Paper | null>
  registerEditorFlush: (fn: (() => Paper | null) | null) => void
  runGenerate: (prompt: string, contextDocumentId?: string) => Promise<void>
  runTargetedEdit: (qId: string, prompt: string) => Promise<void>
  attachContext: (contextDocumentId: string | null) => Promise<void>
  saveAnswerKeyNow: () => Promise<void>
}

const PaperContext = createContext<PaperContextValue | null>(null)

function checkMarks(paper: Paper): boolean {
  const sum = paper.sections.reduce(
    (t, s) => t + s.questions.reduce((q, question) => q + question.marks, 0),
    0,
  )
  return sum !== paper.metadata.total_marks
}

export function PaperProvider({ children }: { children: ReactNode }) {
  const [paper, setPaper] = useState<Paper | null>(null)
  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generationPhase, setGenerationPhase] = useState<string | null>(null)
  const [generationElapsed, setGenerationElapsed] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('paper')
  const [selectedQId, setSelectedQId] = useState<string | null>(null)
  const [paperSyncKey, setPaperSyncKey] = useState(0)
  const [llmInfo, setLlmInfo] = useState<HealthInfo | null>(null)
  const [generatePollTick, setGeneratePollTick] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const editorFlushRef = useRef<(() => Paper | null) | null>(null)

  useEffect(() => {
    fetchHealth()
      .then(setLlmInfo)
      .catch(() => setLlmInfo(null))
  }, [])

  const bumpSync = useCallback(() => setPaperSyncKey((k) => k + 1), [])

  const marksMismatch = paper ? checkMarks(paper) : false

  const loadPaper = useCallback(async (paperId: string) => {
    setLoading(true)
    try {
      const [p, ak] = await Promise.all([getPaper(paperId), getAnswerKey(paperId)])
      setPaper(p)
      setAnswerKey(ak)
      bumpSync()
    } finally {
      setLoading(false)
    }
  }, [bumpSync])

  const updatePaper = useCallback((p: Paper) => setPaper(p), [])
  const updateAnswerKey = useCallback((k: AnswerKey) => setAnswerKey(k), [])

  const registerEditorFlush = useCallback((fn: (() => Paper | null) | null) => {
    editorFlushRef.current = fn
  }, [])

  const flushEditorToPaper = useCallback(async (): Promise<Paper | null> => {
    const flushed = editorFlushRef.current?.() ?? null
    if (!flushed) return paper
    setPaper(flushed)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    try {
      await savePaper(flushed)
      return flushed
    } finally {
      setSaving(false)
    }
  }, [paper])

  const autosavePaper = useCallback((p: Paper) => {
    setPaper(p)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await savePaper(p)
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [])

  const runGenerate = useCallback(
    async (prompt: string, contextDocumentId?: string) => {
      if (!paper) return
      setGenerating(true)
      setGenerateError(null)
      setGenerationPhase('starting')
      setGenerationElapsed(0)
      pollTimer.current = setInterval(() => setGeneratePollTick((t) => t + 1), 2000)
      try {
        const latest = (await flushEditorToPaper()) ?? paper
        if (!latest) return
        const result = await generatePaper(
          latest.paper_id,
          {
            prompt,
            context_document_id: contextDocumentId ?? latest.context_document_id ?? undefined,
            template_id: latest.template_id,
            metadata: latest.metadata,
          },
          (progress) => {
            if (progress.phase) setGenerationPhase(progress.phase)
            if (progress.elapsed_seconds != null) {
              setGenerationElapsed(progress.elapsed_seconds)
            }
          },
        )
        setPaper(result.paper)
        setAnswerKey(result.answer_key)
        bumpSync()
      } catch (err) {
        setGenerateError(formatApiError(err))
        throw err
      } finally {
        if (pollTimer.current) {
          clearInterval(pollTimer.current)
          pollTimer.current = null
        }
        setGenerating(false)
      }
    },
    [paper, bumpSync, flushEditorToPaper],
  )

  const runTargetedEdit = useCallback(
    async (qId: string, prompt: string) => {
      const base = (await flushEditorToPaper()) ?? paper
      if (!base) return
      setGenerating(true)
      setGenerateError(null)
      try {
        const updated = await regenerateQuestion(base.paper_id, qId, { prompt })
        const next: Paper = {
          ...base,
          sections: base.sections.map((s) => ({
            ...s,
            questions: s.questions.map((q) => (q.q_id === qId ? updated : q)),
          })),
        }
        setPaper(next)
        await savePaper(next)
        try {
          const key = await getAnswerKey(base.paper_id)
          setAnswerKey(key)
        } catch {
          /* keep existing key; q_id linkage still holds */
        }
        bumpSync()
        window.dispatchEvent(
          new CustomEvent('paper:scroll-question', { detail: { qId } }),
        )
      } catch (err) {
        setGenerateError(formatApiError(err))
        throw err
      } finally {
        if (pollTimer.current) {
          clearInterval(pollTimer.current)
          pollTimer.current = null
        }
        setGenerating(false)
      }
    },
    [paper, bumpSync, flushEditorToPaper],
  )

  const attachContext = useCallback(
    async (contextDocumentId: string | null) => {
      if (!paper) return
      const updated = await attachPaperContext(paper.paper_id, contextDocumentId)
      setPaper({ ...paper, ...updated, context_document_id: contextDocumentId })
    },
    [paper],
  )

  const saveAnswerKeyNow = useCallback(async () => {
    if (!answerKey) return
    setSaving(true)
    try {
      await saveAnswerKey(answerKey)
    } finally {
      setSaving(false)
    }
  }, [answerKey])

  const value = useMemo(
    () => ({
      paper,
      answerKey,
      loading,
      saving,
      generating,
      generateError,
      generationPhase,
      generationElapsed,
      viewMode,
      selectedQId,
      marksMismatch,
      llmInfo,
      paperSyncKey,
      generatePollTick,
      setViewMode,
      setSelectedQId,
      loadPaper,
      updatePaper,
      updateAnswerKey,
      autosavePaper,
      flushEditorToPaper,
      registerEditorFlush,
      runGenerate,
      runTargetedEdit,
      attachContext,
      saveAnswerKeyNow,
    }),
    [
      paper,
      answerKey,
      loading,
      saving,
      generating,
      generateError,
      generationPhase,
      generationElapsed,
      viewMode,
      selectedQId,
      marksMismatch,
      llmInfo,
      paperSyncKey,
      generatePollTick,
      loadPaper,
      updatePaper,
      updateAnswerKey,
      autosavePaper,
      flushEditorToPaper,
      registerEditorFlush,
      runGenerate,
      runTargetedEdit,
      attachContext,
      saveAnswerKeyNow,
    ],
  )

  return <PaperContext.Provider value={value}>{children}</PaperContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePaper(): PaperContextValue {
  const ctx = useContext(PaperContext)
  if (!ctx) throw new Error('usePaper must be used within PaperProvider')
  return ctx
}
