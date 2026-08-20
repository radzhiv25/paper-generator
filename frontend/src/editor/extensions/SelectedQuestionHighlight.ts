import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const selectedQuestionKey = new PluginKey('selectedQuestion')

export const SelectedQuestionHighlight = Extension.create({
  name: 'selectedQuestionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: selectedQuestionKey,
        props: {
          decorations(state) {
            const { selection } = state
            const { $from } = selection
            const decorations: Decoration[] = []

            for (let depth = $from.depth; depth > 0; depth -= 1) {
              const node = $from.node(depth)
              if (node.type.name === 'question') {
                decorations.push(
                  Decoration.node($from.before(depth), $from.after(depth), {
                    class: 'is-selected',
                  }),
                )
                break
              }
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
