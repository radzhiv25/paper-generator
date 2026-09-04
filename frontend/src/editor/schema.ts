/** Shared Paper / AnswerKey contract — mirrors backend Pydantic schemas. */

import type { JSONContent } from '@tiptap/core'

export type QuestionType = 'mcq' | 'short' | 'long' | 'numerical' | 'freeform'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ContentBlockType = 'text' | 'equation' | 'chem_notation'

export interface ContentBlock {
  type: ContentBlockType
  value: string
}

export interface SubQuestion {
  sq_id: string  // "a", "b", "c"
  content: ContentBlock[]
  marks: number
}

export interface Question {
  q_id: string
  type: QuestionType
  content: ContentBlock[]
  /** TipTap block JSON for rich-text round-trip (formatting, lists, etc.) */
  body_doc?: JSONContent[]
  options?: string[]
  marks: number
  difficulty: Difficulty
  source_chunk_id?: string
  sub_questions?: SubQuestion[]
}

export interface Section {
  section_id: string
  instructions?: string
  questions: Question[]
}

export interface PaperMetadata {
  subject: string
  grade_class: string
  total_marks: number
  duration: string
  instructions?: string
}

export interface Paper {
  paper_id: string
  owner_id: string
  template_id: string
  metadata: PaperMetadata
  sections: Section[]
  created_at: string
  updated_at: string
  context_document_id?: string | null
}

export interface AnswerEntry {
  q_id: string
  answer: ContentBlock[]
  explanation?: string
}

export interface AnswerKey {
  paper_id: string
  answers: AnswerEntry[]
}

export interface Template {
  id: string
  name: string
  type: 'cbse' | 'general' | 'custom'
  description?: string
  layout_config?: Record<string, unknown>
}

export interface RecentPaperSummary {
  paper_id: string
  subject: string
  grade_class: string
  total_marks: number
  updated_at: string
  template_id: string
}

export type ExportFormat = 'docx' | 'pdf'
export type ExportInclude = 'paper' | 'answer_key' | 'both'

export interface ExportRequest {
  format: ExportFormat
  include: ExportInclude
}

export interface GenerateRequest {
  prompt: string
  template_id?: string
  context_document_id?: string
  metadata?: PaperMetadata
}

export interface TargetedEditRequest {
  prompt: string
}

export interface ContextDocumentSummary {
  document_id: string
  filename: string
  status: string
  chunk_count: number
  created_at: string
}

export interface CostEstimate {
  estimated_tokens: number
  estimated_cost_usd: number
  model: string
}

/** Sum marks across all sections; useful for validation warnings. */
export function sumMarks(paper: Paper): number {
  return paper.sections.reduce(
    (total, section) =>
      total +
      section.questions.reduce((s, q) => {
        if (q.sub_questions?.length) {
          return s + q.sub_questions.reduce((sq, sub) => sq + sub.marks, 0)
        }
        return s + q.marks
      }, 0),
    0,
  )
}

export function allQuestionIds(paper: Paper): string[] {
  return paper.sections.flatMap((s) => s.questions.map((q) => q.q_id))
}

export function findQuestion(paper: Paper, qId: string): Question | undefined {
  for (const section of paper.sections) {
    const q = section.questions.find((question) => question.q_id === qId)
    if (q) return q
  }
  return undefined
}
