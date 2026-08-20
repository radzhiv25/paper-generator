import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Paper } from './schema'

export function collectQuestionIdsFromDoc(doc: ProseMirrorNode): string[] {
  const ids: string[] = []
  doc.descendants((node) => {
    if (node.type.name === 'question' && node.attrs.qId) {
      ids.push(String(node.attrs.qId))
    }
  })
  return ids
}

export function collectSectionIdsFromDoc(doc: ProseMirrorNode): string[] {
  const ids: string[] = []
  doc.descendants((node) => {
    if (node.type.name === 'section' && node.attrs.sectionId) {
      ids.push(String(node.attrs.sectionId))
    }
  })
  return ids
}

function nextIdInSeries(prefix: string, existing: string[]): string {
  let max = 0
  for (const id of existing) {
    if (!id.startsWith(prefix)) continue
    const suffix = id.slice(prefix.length)
    const n = Number.parseInt(suffix, 10)
    if (!Number.isNaN(n)) max = Math.max(max, n)
  }
  return `${prefix}${max + 1}`
}

export function nextQuestionIdForSection(sectionId: string, existing: string[]): string {
  return nextIdInSeries(sectionId, existing)
}

export function nextSectionId(existing: string[]): string {
  const letters = existing
    .map((id) => id.trim())
    .filter((id) => /^[A-Z]$/i.test(id))
    .map((id) => id.toUpperCase().charCodeAt(0))
  const maxCode = letters.length ? Math.max(...letters) : 64
  return String.fromCharCode(Math.min(maxCode + 1, 90))
}

export function currentSectionIdFromSelection(doc: ProseMirrorNode, pos: number): string {
  const $pos = doc.resolve(pos)
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth)
    if (node.type.name === 'section') {
      return String(node.attrs.sectionId ?? 'A')
    }
  }
  const sectionIds = collectSectionIdsFromDoc(doc)
  return sectionIds[sectionIds.length - 1] ?? 'A'
}

export function paperHasQuestions(paper: Paper): boolean {
  return paper.sections.some((s) => s.questions.length > 0)
}

export function paperHasWrittenContent(paper: Paper): boolean {
  return paper.sections.some((s) =>
    s.questions.some((q) => q.content.some((c) => c.value.trim().length > 0)),
  )
}
