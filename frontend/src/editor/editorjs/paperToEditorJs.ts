import type { Paper } from '../schema'
import type { EditorJsBlock, EditorJsOutput, QuestionBlockData, SectionBlockData } from './types'

export function paperToEditorJs(paper: Paper): EditorJsOutput {
  const blocks: EditorJsBlock[] = []

  const sections = paper.sections.length
    ? paper.sections
    : [
        {
          section_id: 'A',
          instructions: '',
          questions: [
            {
              q_id: 'A1',
              type: 'short' as const,
              content: [{ type: 'text' as const, value: '' }],
              marks: 1,
              difficulty: 'medium' as const,
            },
          ],
        },
      ]

  for (const section of sections) {
    blocks.push({
      id: `section-${section.section_id}`,
      type: 'section',
      data: {
        sectionId: section.section_id,
        instructions: section.instructions ?? '',
      } satisfies SectionBlockData,
    })

    for (const question of section.questions) {
      const text = question.content
        .map((block) => {
          if (block.type === 'equation') return `$${block.value}$`
          if (block.type === 'chem_notation') return block.value
          return block.value
        })
        .join('')

      blocks.push({
        id: `question-${question.q_id}`,
        type: 'question',
        data: {
          qId: question.q_id,
          text,
          type: question.type,
          marks: question.marks,
          difficulty: question.difficulty,
          options: question.options ?? [],
        } satisfies QuestionBlockData,
      })
    }
  }

  return { time: Date.now(), blocks }
}
