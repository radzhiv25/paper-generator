import { Node, mergeAttributes } from '@tiptap/core'
import katex from 'katex'

export const EquationNode = Node.create({
  name: 'equation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      value: { default: '' },
      blockType: { default: 'equation' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="equation"]' }]
  },

  renderHTML({ node }) {
    return [
      'span',
      mergeAttributes({
        'data-type': 'equation',
        class: 'equation-inline',
        contenteditable: 'false',
      }),
      node.attrs.value,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.className = 'equation-inline'
      dom.setAttribute('data-type', 'equation')
      dom.contentEditable = 'false'
      try {
        katex.render(node.attrs.value, dom, { throwOnError: false })
      } catch {
        dom.textContent = node.attrs.value
      }
      return { dom }
    }
  },
})

export const ChemNotationNode = Node.create({
  name: 'chemNotation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      value: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="chem-notation"]' }]
  },

  renderHTML({ node }) {
    return [
      'span',
      mergeAttributes({
        'data-type': 'chem-notation',
        class: 'chem-notation',
      }),
      node.attrs.value,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.className = 'chem-notation'
      dom.setAttribute('data-type', 'chem-notation')
      dom.contentEditable = 'false'
      try {
        // Render chemical notation as inline math (subscripts/superscripts work naturally)
        katex.render(node.attrs.value, dom, { throwOnError: false, displayMode: false })
      } catch {
        dom.textContent = node.attrs.value
      }
      return { dom }
    }
  },
})
