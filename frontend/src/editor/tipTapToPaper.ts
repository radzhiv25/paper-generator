import type { Editor, JSONContent } from '@tiptap/core'
import type { ContentBlock, Paper, Question, Section } from './schema'

function inlineToContentBlocks(content: JSONContent[] | undefined): ContentBlock[] {
  if (!content?.length) return [{ type: 'text', value: '' }]
  const blocks: ContentBlock[] = []
  for (const node of content) {
    if (node.type === 'equation') {
      blocks.push({ type: 'equation', value: String(node.attrs?.value ?? '') })
    } else if (node.type === 'chemNotation') {
      blocks.push({ type: 'chem_notation', value: String(node.attrs?.value ?? '') })
    } else if (node.type === 'text' && node.text) {
      blocks.push({ type: 'text', value: node.text })
    } else if (
      (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') &&
      node.content
    ) {
      blocks.push(...inlineToContentBlocks(node.content))
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      for (const item of node.content ?? []) {
        if (item.type === 'listItem' && item.content) {
          const line = inlineToContentBlocks(item.content)
            .map((b) => b.value)
            .join('')
          if (line) blocks.push({ type: 'text', value: `• ${line}\n` })
        }
      }
    } else if (node.type === 'horizontalRule') {
      blocks.push({ type: 'text', value: '---\n' })
    }
  }
  return blocks.length ? blocks : [{ type: 'text', value: '' }]
}

function questionBodyBlocks(node: JSONContent): ContentBlock[] {
  const blocks: ContentBlock[] = []
  for (const child of node.content ?? []) {
    if (child.type === 'paragraph' && child.content) {
      blocks.push(...inlineToContentBlocks(child.content))
    } else {
      blocks.push(...inlineToContentBlocks([child]))
    }
  }
  return blocks.length ? blocks : [{ type: 'text', value: '' }]
}

function questionFromNode(node: JSONContent): Question {
  const bodyDoc = node.content?.length ? node.content : undefined
  return {
    q_id: String(node.attrs?.qId ?? 'Q1'),
    type: (node.attrs?.type as Question['type']) ?? 'short',
    marks: Number(node.attrs?.marks ?? 1),
    difficulty: (node.attrs?.difficulty as Question['difficulty']) ?? 'medium',
    options: (node.attrs?.options as string[]) ?? undefined,
    content: questionBodyBlocks(node),
    body_doc: bodyDoc,
  }
}

function sectionFromNode(node: JSONContent): Section {
  const questions = (node.content ?? [])
    .filter((c) => c.type === 'question')
    .map(questionFromNode)
  return {
    section_id: String(node.attrs?.sectionId ?? 'A'),
    instructions: String(node.attrs?.instructions ?? '') || undefined,
    questions,
  }
}

export function tipTapToPaper(editor: Editor, basePaper: Paper): Paper {
  const json = editor.getJSON()
  const sections = (json.content ?? [])
    .filter((c) => c.type === 'section')
    .map(sectionFromNode)

  if (sections.length === 0 && basePaper.sections.some((s) => s.questions.length > 0)) {
    return basePaper
  }

  return {
    ...basePaper,
    sections,
    updated_at: new Date().toISOString(),
  }
}

export function tipTapJsonToPaper(json: JSONContent, basePaper: Paper): Paper {
  const sections = (json.content ?? [])
    .filter((c) => c.type === 'section')
    .map(sectionFromNode)
  return { ...basePaper, sections, updated_at: new Date().toISOString() }
}
