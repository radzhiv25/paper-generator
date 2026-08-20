import type { Difficulty, QuestionType } from '../schema'

export interface EditorJsOutput {
  time?: number
  blocks: EditorJsBlock[]
}

export interface EditorJsBlock {
  id?: string
  type: string
  data: Record<string, unknown>
}

export interface SectionBlockData {
  sectionId: string
  instructions: string
}

export interface QuestionBlockData {
  qId: string
  text: string
  type: QuestionType
  marks: number
  difficulty: Difficulty
  options: string[]
}
