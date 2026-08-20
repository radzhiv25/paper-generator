import { Node, mergeAttributes } from '@tiptap/core'
import {
  collectQuestionIdsFromDoc,
  collectSectionIdsFromDoc,
  nextQuestionIdForSection,
  nextSectionId,
} from '../paperIds'

function emptySectionNode(sectionId: string, firstQId: string) {
  return {
    type: 'section',
    attrs: { sectionId, instructions: '' },
    content: [
      {
        type: 'question',
        attrs: {
          qId: firstQId,
          type: 'short',
          marks: 1,
          difficulty: 'medium',
          options: [],
        },
        content: [{ type: 'paragraph' }],
      },
    ],
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    section: {
      insertSectionAtEnd: (sectionId?: string) => ReturnType
    }
  }
}

export const SectionNode = Node.create({
  name: 'section',
  group: 'block',
  content: 'question+',
  defining: true,

  addAttributes() {
    return {
      sectionId: { default: 'A' },
      instructions: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const children: unknown[] = [
      [
        'div',
        { class: 'section-header font-semibold text-lg mb-2' },
        `Section ${node.attrs.sectionId}`,
      ],
    ]
    if (node.attrs.instructions) {
      children.push([
        'p',
        { class: 'section-instructions text-sm text-gray-600 italic mb-3' },
        node.attrs.instructions,
      ])
    }
    children.push(['div', { class: 'section-questions' }, 0])
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'section',
        class: 'section-node',
      }),
      ...children,
    ]
  },

  addCommands() {
    return {
      insertSectionAtEnd:
        (sectionId) =>
        ({ chain, state }) => {
          const sectionIds = collectSectionIdsFromDoc(state.doc)
          const newSectionId = sectionId ?? nextSectionId(sectionIds)
          const qIds = collectQuestionIdsFromDoc(state.doc)
          const firstQId = nextQuestionIdForSection(newSectionId, qIds)
          const insertPos = state.doc.content.size

          return chain()
            .insertContentAt(insertPos, emptySectionNode(newSectionId, firstQId))
            .focus(insertPos + 2)
            .run()
        },
    }
  },
})
