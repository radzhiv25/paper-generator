import type { Paper, Question, Section } from '../schema'
import type { EditorJsOutput, QuestionBlockData, SectionBlockData } from './types'

function parseQuestionText(text: string): Question['content'] {
  if (!text.trim()) return [{ type: 'text', value: '' }]
  return [{ type: 'text', value: text }]
}

export function editorJsToPaper(output: EditorJsOutput, basePaper: Paper): Paper {
  const sections: Section[] = []
  let current: Section | null = null

  for (const block of output.blocks) {
    if (block.type === 'section') {
      const data = block.data as unknown as SectionBlockData
      current = {
        section_id: data.sectionId || 'A',
        instructions: data.instructions?.trim() || undefined,
        questions: [],
      }
      sections.push(current)
      continue
    }

    if (block.type === 'question') {
      const data = block.data as unknown as QuestionBlockData
      const question: Question = {
        q_id: data.qId || 'Q1',
        type: data.type || 'short',
        marks: Number(data.marks) || 1,
        difficulty: data.difficulty || 'medium',
        content: parseQuestionText(data.text ?? ''),
        options:
          data.type === 'mcq' && data.options?.length
            ? data.options.filter(Boolean)
            : undefined,
      }

      if (!current) {
        current = { section_id: 'A', questions: [] }
        sections.push(current)
      }
      current.questions.push(question)
    }
  }

  if (sections.length === 0 && basePaper.sections.some((s) => s.questions.length > 0)) {
    return basePaper
  }

  return {
    ...basePaper,
    sections,
    updated_at: new Date().toISOString(),
  }
}
