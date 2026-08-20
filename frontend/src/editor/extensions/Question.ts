import { Node, mergeAttributes } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { Difficulty, QuestionType } from '../schema'
import {
  collectQuestionIdsFromDoc,
  currentSectionIdFromSelection,
  nextQuestionIdForSection,
} from '../paperIds'
import { QuestionNodeView } from '../../components/DocumentCanvas/QuestionNodeView'

export interface QuestionAttributes {
  qId: string
  type: QuestionType
  marks: number
  difficulty: Difficulty
  options: string[]
}

function emptyQuestionNode(qId: string) {
  return {
    type: 'question',
    attrs: {
      qId,
      type: 'short',
      marks: 1,
      difficulty: 'medium',
      options: [],
    },
    content: [{ type: 'paragraph' }],
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    question: {
      setQuestion: (attrs: Partial<QuestionAttributes>) => ReturnType
      insertQuestionAfter: (attrs?: Partial<QuestionAttributes>) => ReturnType
      moveQuestion: (direction: -1 | 1) => ReturnType
      deleteQuestion: (pos?: number) => ReturnType
    }
  }
}

export const QuestionNode = Node.create({
  name: 'question',
  group: 'block',
  content: '(paragraph | heading | blockquote | horizontalRule | bulletList | orderedList)+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      qId: { default: 'Q1' },
      type: { default: 'short' },
      marks: { default: 1 },
      difficulty: { default: 'medium' },
      options: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="question"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'question',
        'data-q-id': node.attrs.qId,
        class: 'question-node',
      }),
      ['div', { class: 'question-body' }, 0],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionNodeView)
  },

  addCommands() {
    return {
      setQuestion:
        (attrs) =>
        ({ commands }) =>
          commands.setNode(this.name, attrs),
      insertQuestionAfter:
        (attrs) =>
        ({ chain, state }) => {
          const { selection } = state
          const existing = collectQuestionIdsFromDoc(state.doc)
          const sectionId = currentSectionIdFromSelection(state.doc, selection.from)
          const qId = attrs?.qId ?? nextQuestionIdForSection(sectionId, existing)

          let insertPos = selection.from
          let found = false
          for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
            if (selection.$from.node(depth).type.name === 'question') {
              insertPos = selection.$from.after(depth)
              found = true
              break
            }
          }

          if (!found) {
            for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
              if (selection.$from.node(depth).type.name === 'section') {
                insertPos = selection.$from.end(depth)
                found = true
                break
              }
            }
          }

          if (!found) insertPos = state.doc.content.size

          return chain()
            .insertContentAt(insertPos, emptyQuestionNode(qId))
            .focus(insertPos + 2)
            .run()
        },
      deleteQuestion:
        (pos) =>
        ({ state, tr, dispatch }) => {
          const resolvedPos = pos ?? state.selection.from
          const $pos = state.doc.resolve(resolvedPos)

          let questionDepth = -1
          for (let depth = $pos.depth; depth > 0; depth -= 1) {
            if ($pos.node(depth).type.name === 'question') {
              questionDepth = depth
              break
            }
          }
          if (questionDepth < 0) return false

          let sectionDepth = -1
          for (let depth = questionDepth - 1; depth > 0; depth -= 1) {
            if ($pos.node(depth).type.name === 'section') {
              sectionDepth = depth
              break
            }
          }
          if (sectionDepth < 0) return false

          const section = $pos.node(sectionDepth)
          let questionCount = 0
          section.forEach((child) => {
            if (child.type.name === 'question') questionCount += 1
          })
          if (questionCount <= 1) return false

          const from = $pos.before(questionDepth)
          const to = $pos.after(questionDepth)
          if (!dispatch) return true
          tr.delete(from, to)
          dispatch(tr.scrollIntoView())
          return true
        },
      moveQuestion:
        (direction) =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection
          let qDepth = -1
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === 'question') {
              qDepth = depth
              break
            }
          }
          if (qDepth < 0) return false
          const parent = $from.node(qDepth - 1)
          const index = $from.index(qDepth - 1)
          const swapWith = index + direction
          if (swapWith < 0 || swapWith >= parent.childCount) return false
          if (parent.child(swapWith).type.name !== 'question') return false

          const parentStart = $from.start(qDepth - 1)
          const positions: number[] = []
          let cursor = parentStart
          parent.forEach((child) => {
            positions.push(cursor)
            cursor += child.nodeSize
          })

          const a = Math.min(index, swapWith)
          const b = Math.max(index, swapWith)
          const nodeA = parent.child(a)
          const nodeB = parent.child(b)
          if (!dispatch) return true
          tr.replaceWith(
            positions[a],
            positions[b] + nodeB.nodeSize,
            Fragment.fromArray([nodeB, nodeA]),
          )
          dispatch(tr.scrollIntoView())
          return true
        },
    }
  },
})
