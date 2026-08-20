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
  const bodyContent =
    question.body_doc?.length
      ? question.body_doc
      : [{ type: 'paragraph', content: contentBlocksToInline(question.content) }]

  return {
    type: 'question',
    attrs: {
      qId: question.q_id,
      type: question.type,
      marks: question.marks,
      difficulty: question.difficulty,
      options: question.options ?? [],
    },
    content: bodyContent,
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
