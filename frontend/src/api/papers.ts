import type {
  AnswerKey,
  AnswerEntry,
  CostEstimate,
  ContextDocumentSummary,
  ExportRequest,
  GenerateRequest,
  Paper,
  RecentPaperSummary,
  TargetedEditRequest,
  Template,
  Question,
} from '../editor/schema'
import fixtureData from '../fixtures/sample-paper.json'
import { apiFetch, apiFetchWithFallback, getMockMode } from './client'
import { getApiBase } from './config'

const fixture = fixtureData as {
  paper: Paper
  answer_key: AnswerKey
}

interface PaperResponse {
  paper: Paper
  marks_warning?: string | null
}

function unwrapPaper(res: Paper | PaperResponse): Paper {
  return 'paper' in res ? res.paper : res
}

const localPapers = new Map<string, Paper>()
const localAnswerKeys = new Map<string, AnswerKey>()

function clonePaper(paper: Paper): Paper {
  return structuredClone(paper)
}

function initLocalStore(): void {
  if (!localPapers.has(fixture.paper.paper_id)) {
    localPapers.set(fixture.paper.paper_id, clonePaper(fixture.paper))
    localAnswerKeys.set(fixture.paper.paper_id, structuredClone(fixture.answer_key))
  }
}

initLocalStore()

export async function getTemplates(): Promise<Template[]> {
  return apiFetchWithFallback('/templates', { method: 'GET' }, () => [
    {
      id: 'cbse',
      name: 'CBSE Format',
      type: 'cbse',
      description: 'Central Board of Secondary Education style with sections A/B/C',
    },
    {
      id: 'general',
      name: 'General Paper',
      type: 'general',
      description: 'Flexible format for schools and colleges',
    },
  ])
}

export async function getRecentPapers(): Promise<RecentPaperSummary[]> {
  return apiFetchWithFallback('/papers/recent', { method: 'GET' }, () => {
    initLocalStore()
    return Array.from(localPapers.values()).map((p) => ({
      paper_id: p.paper_id,
      subject: p.metadata.subject,
      grade_class: p.metadata.grade_class,
      total_marks: p.metadata.total_marks,
      updated_at: p.updated_at,
      template_id: p.template_id,
    }))
  })
}

export async function createPaper(templateId: string): Promise<Paper> {
  const res = await apiFetchWithFallback<Paper | PaperResponse>(
    '/papers',
    {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId }),
    },
    () => {
      const now = new Date().toISOString()
      const paper: Paper = {
        paper_id: `paper-${crypto.randomUUID().slice(0, 8)}`,
        owner_id: 'local-user',
        template_id: templateId,
        metadata: {
          subject: 'Untitled',
          grade_class: '',
          total_marks: 0,
          duration: '3 hours',
        },
        sections: [],
        created_at: now,
        updated_at: now,
      }
      localPapers.set(paper.paper_id, paper)
      localAnswerKeys.set(paper.paper_id, { paper_id: paper.paper_id, answers: [] })
      return paper
    },
  )
  return unwrapPaper(res)
}

export async function getPaper(paperId: string): Promise<Paper> {
  const res = await apiFetchWithFallback<Paper | PaperResponse>(
    `/papers/${paperId}`,
    { method: 'GET' },
    () => {
      initLocalStore()
      const paper = localPapers.get(paperId) ?? clonePaper(fixture.paper)
      localPapers.set(paperId, paper)
      return clonePaper(paper)
    },
  )
  return unwrapPaper(res)
}

export async function savePaper(paper: Paper): Promise<Paper> {
  const updated = { ...paper, updated_at: new Date().toISOString() }
  const body = {
    template_id: updated.template_id,
    metadata: updated.metadata,
    sections: updated.sections,
  }
  const res = await apiFetchWithFallback<Paper | PaperResponse>(
    `/papers/${paper.paper_id}`,
    { method: 'PUT', body: JSON.stringify(body) },
    () => {
      localPapers.set(paper.paper_id, clonePaper(updated))
      return updated
    },
  )
  return unwrapPaper(res)
}

export async function generatePaper(
  paperId: string,
  request: GenerateRequest,
  onProgress?: (status: {
    phase?: string
    elapsed_seconds?: number
  }) => void,
): Promise<{ paper: Paper; answer_key: AnswerKey }> {
  try {
    await apiFetch<{ status: string; paper_id: string }>(
      `/papers/${paperId}/generate`,
      { method: 'POST', body: JSON.stringify(request) },
    )

    const deadline = Date.now() + 15 * 60 * 1000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000))
      const status = await apiFetch<{
        status: 'idle' | 'generating' | 'complete' | 'failed'
        paper_id: string
        phase?: string
        elapsed_seconds?: number
        error?: string
        paper?: Paper
        answer_key?: AnswerKey
      }>(`/papers/${paperId}/generation-status`, { method: 'GET' })

      onProgress?.({
        phase: status.phase,
        elapsed_seconds: status.elapsed_seconds,
      })

      if (status.status === 'complete' && status.paper && status.answer_key) {
        return { paper: status.paper, answer_key: status.answer_key }
      }
      if (status.status === 'failed') {
        throw new Error(status.error ?? 'Generation failed')
      }

      // Client-side recovery if server saved but job state is stale
      if (status.status === 'generating' && (status.elapsed_seconds ?? 0) >= 30) {
        try {
          const [paper, answerKey] = await Promise.all([
            getPaper(paperId),
            getAnswerKey(paperId),
          ])
          const hasQuestions = paper.sections.some((s) => s.questions.length > 0)
          if (hasQuestions && answerKey.answers.length > 0) {
            return { paper, answer_key: answerKey }
          }
        } catch {
          // keep polling
        }
      }
    }
    throw new Error('Generation timed out after 15 minutes')
  } catch (err) {
    if (err instanceof Error && err.message.includes('Generation')) throw err
    if (getMockMode()) throw err
    // Offline fallback only when backend is unreachable
    return apiFetchWithFallback(
      `/papers/${paperId}/generate`,
      { method: 'POST', body: JSON.stringify(request) },
      async () => {
        await new Promise((r) => setTimeout(r, 800))
        const existing = localPapers.get(paperId)
        const paper = existing ? clonePaper(existing) : clonePaper(fixture.paper)
        paper.paper_id = paperId
        paper.updated_at = new Date().toISOString()
        if (request.metadata) {
          paper.metadata = { ...paper.metadata, ...request.metadata }
        }
        if (request.prompt) {
          paper.metadata.instructions = `Generated from prompt: ${request.prompt.slice(0, 120)}`
        }
        if (!existing) {
          const generated = clonePaper(fixture.paper)
          generated.paper_id = paperId
          if (request.metadata) {
            generated.metadata = { ...generated.metadata, ...request.metadata }
          }
          localPapers.set(paperId, generated)
          const answerKey = structuredClone(fixture.answer_key)
          answerKey.paper_id = paperId
          localAnswerKeys.set(paperId, answerKey)
          return { paper: generated, answer_key: answerKey }
        }
        const answerKey =
          localAnswerKeys.get(paperId) ?? structuredClone(fixture.answer_key)
        answerKey.paper_id = paperId
        localPapers.set(paperId, paper)
        localAnswerKeys.set(paperId, answerKey)
        return { paper, answer_key: answerKey }
      },
    )
  }
}

export async function regenerateQuestion(
  paperId: string,
  qId: string,
  request: TargetedEditRequest,
): Promise<Question> {
  return apiFetchWithFallback(
    `/papers/${paperId}/questions/${qId}`,
    { method: 'PATCH', body: JSON.stringify(request) },
    async () => {
      await new Promise((r) => setTimeout(r, 500))
      const paper = localPapers.get(paperId) ?? clonePaper(fixture.paper)
      for (const section of paper.sections) {
        const idx = section.questions.findIndex((q) => q.q_id === qId)
        if (idx >= 0) {
          const updated: Question = {
            ...section.questions[idx],
            difficulty:
              request.prompt.toLowerCase().includes('hard') ? 'hard' : 'medium',
            content: [
              { type: 'text', value: `[AI edit] ${request.prompt} — ` },
              ...section.questions[idx].content,
            ],
          }
          section.questions[idx] = updated
          localPapers.set(paperId, paper)
          return updated
        }
      }
      throw new Error(`Question ${qId} not found`)
    },
  )
}

export async function getAnswerKey(paperId: string): Promise<AnswerKey> {
  return apiFetchWithFallback(`/papers/${paperId}/answer-key`, { method: 'GET' }, () => {
    initLocalStore()
    return (
      localAnswerKeys.get(paperId) ?? structuredClone(fixture.answer_key)
    )
  })
}

export async function patchAnswer(
  paperId: string,
  qId: string,
  entry: AnswerEntry,
): Promise<AnswerKey> {
  return apiFetchWithFallback(
    `/papers/${paperId}/answer-key/${qId}`,
    { method: 'PATCH', body: JSON.stringify(entry) },
    () => {
      const key = localAnswerKeys.get(paperId) ?? {
        paper_id: paperId,
        answers: [],
      }
      const idx = key.answers.findIndex((a) => a.q_id === qId)
      if (idx >= 0) key.answers[idx] = entry
      else key.answers.push(entry)
      localAnswerKeys.set(paperId, key)
      return key
    },
  )
}

export async function saveAnswerKey(answerKey: AnswerKey): Promise<AnswerKey> {
  return apiFetchWithFallback(
    `/papers/${answerKey.paper_id}/answer-key`,
    { method: 'PUT', body: JSON.stringify(answerKey) },
    () => {
      localAnswerKeys.set(answerKey.paper_id, structuredClone(answerKey))
      return answerKey
    },
  )
}

export async function estimateCost(prompt: string): Promise<CostEstimate> {
  return apiFetchWithFallback(
    '/generation/estimate',
    { method: 'POST', body: JSON.stringify({ prompt }) },
    () => {
      const tokens = Math.max(500, prompt.length * 12)
      return {
        estimated_tokens: tokens,
        estimated_cost_usd: tokens * 0.000003,
        model: 'claude-sonnet (BYOK)',
      }
    },
  )
}

export async function exportPaper(
  paperId: string,
  request: ExportRequest,
): Promise<Blob> {
  try {
    const result = await apiFetch<{
      filename: string
      download_url: string
      format: string
    }>(`/papers/${paperId}/export`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
    const downloadRes = await fetch(`${getApiBase()}${result.download_url}`)
    if (!downloadRes.ok) {
      throw new Error(`Download failed: ${downloadRes.status}`)
    }
    return downloadRes.blob()
  } catch {
    const label = `${request.include}-${request.format}`
    const content = `Mock export for paper ${paperId} (${label})\nGenerated at ${new Date().toISOString()}`
    const type =
      request.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    return new Blob([content], { type })
  }
}

export async function uploadContext(file: File): Promise<ContextDocumentSummary> {
  const form = new FormData()
  form.append('file', file)
  return apiFetchWithFallback(
    '/uploads/context',
    { method: 'POST', body: form, headers: {} },
    () => ({
      document_id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      filename: file.name,
      status: 'ready',
      chunk_count: 0,
      created_at: new Date().toISOString(),
    }),
  )
}

export async function listContextDocuments(): Promise<ContextDocumentSummary[]> {
  return apiFetchWithFallback('/uploads', { method: 'GET' }, () => [])
}

export async function getContextDocument(
  documentId: string,
): Promise<ContextDocumentSummary> {
  return apiFetchWithFallback(
    `/uploads/${documentId}`,
    { method: 'GET' },
    () => ({
      document_id: documentId,
      filename: 'Context PDF',
      status: 'ready',
      chunk_count: 0,
      created_at: new Date().toISOString(),
    }),
  )
}

export async function attachPaperContext(
  paperId: string,
  contextDocumentId: string | null,
): Promise<Paper> {
  const res = await apiFetchWithFallback<Paper | PaperResponse>(
    `/papers/${paperId}/context`,
    {
      method: 'PUT',
      body: JSON.stringify({ context_document_id: contextDocumentId }),
    },
    () => {
      const paper = localPapers.get(paperId)
      if (paper) {
        paper.context_document_id = contextDocumentId
        localPapers.set(paperId, paper)
        return paper
      }
      const fallback = clonePaper(fixture.paper)
      fallback.paper_id = paperId
      fallback.context_document_id = contextDocumentId
      return fallback
    },
  )
  return unwrapPaper(res)
}

export function isUsingMockBackend(): boolean {
  return getMockMode()
}
