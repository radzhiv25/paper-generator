import sampleFixture from '../../fixtures/sample-paper.json'
import type { AnswerKey, Paper } from '../../editor/schema'

export const previewPaper = sampleFixture.paper as Paper
export const previewAnswerKey = sampleFixture.answer_key as AnswerKey

export const previewPrompt =
  'Create a CBSE-style Physics paper for Class XII: 5 MCQs on electrostatics, 2 numericals on mechanics, 1 long derivation. Medium difficulty, 50 marks total.'

export const previewContextDoc = {
  filename: 'Physics_XII_Syllabus.pdf',
  chunk_count: 42,
}

export const workflowSteps = [
  {
    step: '01',
    title: 'Attach your syllabus',
    body: 'Upload a PDF or pick from your library. PaperCue chunks it for retrieval during generation and targeted edits.',
  },
  {
    step: '02',
    title: 'Generate & refine',
    body: 'Describe the paper in plain language. Edit in a Word-like canvas, or select one question and use ⌘K for a scoped AI rewrite.',
  },
  {
    step: '03',
    title: 'Export with answers',
    body: 'Download DOCX or PDF — paper only, answer key only, or both — with question ids wired through end to end.',
  },
] as const

export type PreviewTab = 'editor' | 'generate' | 'answer_key' | 'export'

export const previewTabs: { id: PreviewTab; label: string; description: string }[] = [
  {
    id: 'editor',
    label: 'Document editor',
    description: 'Print-style pages, sections, marks, and rich text — the same canvas you use after sign-in.',
  },
  {
    id: 'generate',
    label: 'AI generation',
    description: 'Prompt panel with syllabus context, cost estimate, and one-click full-paper generation.',
  },
  {
    id: 'answer_key',
    label: 'Answer key',
    description: 'Linked answers for every question id, with equations and explanations.',
  },
  {
    id: 'export',
    label: 'Export',
    description: 'Word or PDF, paper or answer key or both — from the bar under the canvas.',
  },
]
