import type { JSONContent } from '@tiptap/core'
import type { ContentBlock, Paper, Question, Section } from './schema'

function contentBlocksToInline(blocks: ContentBlock[]): JSONContent[] {
  const nodes: JSONContent[] = []
  for (const block of blocks) {
    if (block.type === 'equation') {
      nodes.push({ type: 'equation', attrs: { value: block.value, blockType: 'equation' } })
    } else if (block.type === 'chem_notation') {
      nodes.push({ type: 'chemNotation', attrs: { value: block.value } })
    } else {
      nodes.push({ type: 'text', text: block.value })
    }
  }
  if (nodes.length === 0) {
    nodes.push({ type: 'text', text: '' })
  }
  return nodes
}

function sectionToNode(section: Section): JSONContent {
  return {
    type: 'section',
    attrs: {
      sectionId: section.section_id,
      instructions: section.instructions ?? '',
    },
    content: section.questions.map(questionToNode),
  }
}

function questionToNode(question: Question): JSONContent {
  const mainContent =
    question.body_doc?.length
      ? question.body_doc
      : [{ type: 'paragraph', content: contentBlocksToInline(question.content) }]

  // Append sub-question paragraphs as readable content inside the node
  const subContent: JSONContent[] = (question.sub_questions ?? []).map((sq) => ({
    type: 'paragraph',
    content: [
      { type: 'text', text: `(${sq.sq_id}) `, marks: [{ type: 'bold' }] },
      ...contentBlocksToInline(sq.content),
      { type: 'text', text: `  [${sq.marks} mark${sq.marks === 1 ? '' : 's'}]`, marks: [{ type: 'italic' }] },
    ],
  }))

  return {
    type: 'question',
    attrs: {
      qId: question.q_id,
      type: question.type,
      marks: question.marks,
      difficulty: question.difficulty,
      options: question.options ?? [],
      subQuestions: question.sub_questions ?? [],
    },
    content: [...mainContent, ...subContent],
  }
}

export function paperToTipTapContent(paper: Paper): JSONContent {
  const sections = paper.sections.length
    ? paper.sections.map(sectionToNode)
    : [
        {
          type: 'section',
          attrs: { sectionId: 'A', instructions: '' },
          content: [
            {
              type: 'question',
              attrs: {
                qId: 'A1',
                type: 'short',
                marks: 1,
                difficulty: 'medium',
                options: [],
              },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
            },
          ],
        },
      ]

  return {
    type: 'doc',
    content: sections,
  }
}
