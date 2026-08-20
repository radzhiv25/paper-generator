import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Cpu, Loader2, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  getContextDocument,
  listContextDocuments,
  uploadContext,
  estimateCost,
} from '../../api/papers'
import type { ContextDocumentSummary, CostEstimate } from '../../editor/schema'
import { paperHasWrittenContent } from '../../editor/paperIds'
import { formatCost, formatTokens } from '../../lib/costEstimate'
import { usePaper } from '../../state/PaperContext'

function modelLabel(llmInfo: { llm_provider: string; llm_model?: string } | null): string {
  if (!llmInfo) return 'checking backend…'
  if (llmInfo.llm_provider === 'local') {
    return `Ollama · ${llmInfo.llm_model ?? 'local model'}`
  }
  if (llmInfo.llm_provider === 'byok') return 'Bring Your Own Key'
  return llmInfo.llm_model || llmInfo.llm_provider
}

export function PromptPanel() {
  const {
    paper,
    generating,
    generateError,
    runGenerate,
    attachContext,
    marksMismatch,
    viewMode,
    setViewMode,
    llmInfo,
  } = usePaper()
  const [prompt, setPrompt] = useState('')
  const [estimate, setEstimate] = useState<CostEstimate | null>(null)
  const [library, setLibrary] = useState<ContextDocumentSummary[]>([])
  const [activeDoc, setActiveDoc] = useState<ContextDocumentSummary | null>(null)
  const [uploading, setUploading] = useState(false)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)

  const contextDocId = paper?.context_document_id ?? undefined

  useEffect(() => {
    void listContextDocuments().then(setLibrary).catch(() => setLibrary([]))
  }, [paper?.paper_id])

  useEffect(() => {
    if (!contextDocId) {
      setActiveDoc(null)
      return
    }
    const fromLibrary = library.find((d) => d.document_id === contextDocId)
    if (fromLibrary) {
      setActiveDoc(fromLibrary)
      return
    }
    void getContextDocument(contextDocId)
      .then(setActiveDoc)
      .catch(() =>
        setActiveDoc({
          document_id: contextDocId,
          filename: 'Attached syllabus',
          status: 'ready',
          chunk_count: 0,
          created_at: new Date().toISOString(),
        }),
      )
  }, [contextDocId, library])

  useEffect(() => {
    if (!prompt.trim()) return
    const timer = setTimeout(() => {
      estimateCost(prompt).then(setEstimate).catch(() => setEstimate(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [prompt])

  const displayEstimate = prompt.trim() ? estimate : null

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    await runGenerate(prompt.trim(), contextDocId)
    setReplaceConfirmOpen(false)
  }

  const requestGenerate = () => {
    if (!prompt.trim() || !paper) return
    if (paperHasWrittenContent(paper)) {
      setReplaceConfirmOpen(true)
      return
    }
    void handleGenerate()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadContext(file)
      setLibrary((prev) => [result, ...prev.filter((d) => d.document_id !== result.document_id)])
      await attachContext(result.document_id)
      setActiveDoc(result)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handlePick = async (id: string) => {
    if (!id) {
      await attachContext(null)
      setActiveDoc(null)
      return
    }
    await attachContext(id)
  }

  if (!paper) {
    return (
      <aside className="flex h-full w-80 flex-col border-l border-border bg-panel p-4">
        <p className="text-sm text-muted-foreground">
          Open or create a paper to use the prompt panel.
        </p>
      </aside>
    )
  }

  const questionCount = paper.sections.reduce((n, s) => n + s.questions.length, 0)

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-panel">
      <div className="flex h-14 shrink-0 flex-col justify-center border-b border-border px-4">
        <h2 className="text-sm font-semibold leading-tight">Prompt</h2>
        <p className="text-xs text-muted-foreground">Describe the paper you want to generate.</p>
      </div>

      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as 'paper' | 'answer_key')}
        className="h-10 shrink-0 border-b border-border"
      >
        <TabsList variant="line" className="h-10 w-full rounded-none bg-transparent p-0">
          <TabsTrigger value="paper" className="h-10 flex-1 rounded-none text-xs">
            Paper
          </TabsTrigger>
          <TabsTrigger value="answer_key" className="h-10 flex-1 rounded-none text-xs">
            Answer Key
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="context-library" className="text-xs">
            Syllabus context
          </Label>
          <select
            id="context-library"
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
            value={contextDocId ?? ''}
            onChange={(e) => void handlePick(e.target.value)}
          >
            <option value="">No document attached</option>
            {library.map((doc) => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.filename}
              </option>
            ))}
          </select>
          <div className="relative">
            <Input
              id="context-pdf"
              type="file"
              accept=".pdf"
              onChange={(e) => void handleUpload(e)}
              disabled={uploading}
              className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
            {uploading && (
              <Loader2 className="absolute top-2.5 right-2 size-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {activeDoc && (
            <p className="flex items-center gap-1 text-xs text-green-700">
              <CheckCircle2 className="size-3" />
              In use: {activeDoc.filename}
              {activeDoc.chunk_count > 0 ? ` · ${activeDoc.chunk_count} chunks` : ''}
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="generation-prompt" className="text-xs">
            Generation prompt
          </Label>
          <Textarea
            id="generation-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="e.g. 10 MCQs + 2 long-answer on thermodynamics, medium difficulty, 50 marks"
          />
        </div>

        {displayEstimate && (
          <Alert className="mt-3">
            <AlertDescription className="text-xs">
              <p>
                Estimate: {formatTokens(displayEstimate.estimated_tokens)} ·{' '}
                {formatCost(displayEstimate)}
              </p>
              <p className="flex items-center gap-1 text-muted-foreground">
                <Cpu className="size-3" />
                {displayEstimate.model}
              </p>
              {llmInfo?.llm_provider === 'byok' && (
                <p className="mt-1 text-amber-600">
                  Add your API key in Settings for BYOK generation.
                </p>
              )}
              {llmInfo?.llm_provider === 'local' && (
                <p className="mt-1 text-muted-foreground">
                  Using local Ollama — generation may take 30–90 seconds.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {generating && (
          <Alert className="mt-3 border-brand-200 bg-brand-50">
            <Loader2 className="size-4 animate-spin text-brand-600" />
            <AlertDescription className="text-xs text-brand-800">
              Generating with {modelLabel(llmInfo)}…
              <br />
              Polling for results — the paper will appear automatically.
            </AlertDescription>
          </Alert>
        )}

        {generateError && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle />
            <AlertDescription>{generateError}</AlertDescription>
          </Alert>
        )}

        {questionCount > 0 && !generating && (
          <Alert className="mt-3 border-amber-200 bg-amber-50">
            <AlertTriangle className="text-amber-600" />
            <AlertDescription className="text-xs text-amber-900">
              This paper has {questionCount} question{questionCount === 1 ? '' : 's'}.
              Generating again will <strong>replace the entire paper</strong> and answer key.
              Use ⌘K on a selected question for a single-question AI edit instead.
            </AlertDescription>
          </Alert>
        )}

        {marksMismatch && (
          <Alert className="mt-3 border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="text-amber-600" />
            <AlertDescription>
              Question marks don&apos;t sum to total marks ({paper.metadata.total_marks}).
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="h-9 shrink-0 border-t border-border bg-white" aria-hidden />

      <div className="shrink-0 border-t border-border px-4 py-3">
        <Button
          type="button"
          onClick={requestGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full"
        >
          <span className="inline-flex min-w-[8.5rem] items-center justify-center gap-2">
            {generating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {generating ? 'Generating…' : 'Generate Paper'}
          </span>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          ⌘⇧Q new question · ⌘K edit one question with AI
        </p>
      </div>

      <Dialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace existing paper?</DialogTitle>
            <DialogDescription>
              Generate will overwrite all {questionCount} current question
              {questionCount === 1 ? '' : 's'} and the answer key with a freshly generated paper.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReplaceConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleGenerate()}>
              Replace paper
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
