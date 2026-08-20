import type { Difficulty, QuestionType } from '../../schema'
import type { QuestionBlockData } from '../types'

type QuestionConfig = {
  data?: QuestionBlockData
  config?: {
    onSelect?: (qId: string) => void
  }
}

const QUESTION_TYPES: QuestionType[] = ['mcq', 'short', 'long', 'numerical', 'freeform']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export class QuestionTool {
  private data: QuestionBlockData
  private onSelect?: (qId: string) => void

  static get toolbox() {
    return {
      title: 'Question',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.2 1.2-1.2 2.2"/><circle cx="12" cy="17" r=".8" fill="currentColor"/></svg>',
    }
  }

  constructor({ data, config }: QuestionConfig) {
    this.onSelect = config?.onSelect
    this.data = {
      qId: data?.qId ?? 'Q1',
      text: data?.text ?? '',
      type: data?.type ?? 'short',
      marks: data?.marks ?? 1,
      difficulty: data?.difficulty ?? 'medium',
      options: data?.options ?? [],
    }
  }

  render() {
    const wrapper = document.createElement('div')
    wrapper.className = 'ej-question-block'

    const header = document.createElement('div')
    header.className = 'ej-question-header'

    const title = document.createElement('span')
    title.className = 'ej-question-label'
    title.textContent = 'Question'

    const selectBtn = document.createElement('button')
    selectBtn.type = 'button'
    selectBtn.className = 'ej-select-btn'
    selectBtn.textContent = 'Select for AI (⌘K)'
    selectBtn.addEventListener('click', () => this.onSelect?.(this.data.qId))

    header.append(title, selectBtn)

    const meta = document.createElement('div')
    meta.className = 'ej-question-meta'

    const qIdInput = document.createElement('input')
    qIdInput.className = 'ej-input ej-input-sm'
    qIdInput.value = this.data.qId
    qIdInput.placeholder = 'A1'
    qIdInput.addEventListener('input', () => {
      this.data.qId = qIdInput.value
    })

    const marksInput = document.createElement('input')
    marksInput.type = 'number'
    marksInput.min = '0'
    marksInput.className = 'ej-input ej-input-sm ej-input-marks'
    marksInput.value = String(this.data.marks)
    marksInput.addEventListener('input', () => {
      this.data.marks = Number(marksInput.value) || 0
    })

    const typeSelect = document.createElement('select')
    typeSelect.className = 'ej-select'
    for (const t of QUESTION_TYPES) {
      const opt = document.createElement('option')
      opt.value = t
      opt.textContent = t.toUpperCase()
      typeSelect.append(opt)
    }
    typeSelect.value = this.data.type
    typeSelect.addEventListener('change', () => {
      this.data.type = typeSelect.value as QuestionType
      optionsWrap.style.display = this.data.type === 'mcq' ? 'block' : 'none'
    })

    const diffSelect = document.createElement('select')
    diffSelect.className = 'ej-select'
    for (const d of DIFFICULTIES) {
      const opt = document.createElement('option')
      opt.value = d
      opt.textContent = d
      diffSelect.append(opt)
    }
    diffSelect.value = this.data.difficulty
    diffSelect.addEventListener('change', () => {
      this.data.difficulty = diffSelect.value as Difficulty
    })

    meta.append(
      field('ID', qIdInput),
      field('Marks', marksInput),
      field('Type', typeSelect),
      field('Level', diffSelect),
    )

    const textLabel = document.createElement('label')
    textLabel.textContent = 'Question text'
    const textArea = document.createElement('textarea')
    textArea.className = 'ej-textarea ej-question-text'
    textArea.rows = 4
    textArea.value = this.data.text
    textArea.placeholder = 'Enter the question…'
    textArea.addEventListener('input', () => {
      this.data.text = textArea.value
    })

    const optionsWrap = document.createElement('div')
    optionsWrap.className = 'ej-options-wrap'
    optionsWrap.style.display = this.data.type === 'mcq' ? 'block' : 'none'

    const optionsLabel = document.createElement('label')
    optionsLabel.textContent = 'MCQ options (one per line)'
    const optionsArea = document.createElement('textarea')
    optionsArea.className = 'ej-textarea'
    optionsArea.rows = 4
    optionsArea.value = (this.data.options ?? []).join('\n')
    optionsArea.placeholder = 'Option A\nOption B\nOption C\nOption D'
    optionsArea.addEventListener('input', () => {
      this.data.options = optionsArea.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    })
    optionsWrap.append(optionsLabel, optionsArea)

    wrapper.append(header, meta, textLabel, textArea, optionsWrap)
    return wrapper
  }

  save(): QuestionBlockData {
    return { ...this.data }
  }
}

function field(label: string, control: HTMLElement) {
  const wrap = document.createElement('div')
  wrap.className = 'ej-field'
  const lbl = document.createElement('span')
  lbl.className = 'ej-field-label'
  lbl.textContent = label
  wrap.append(lbl, control)
  return wrap
}

export default QuestionTool
