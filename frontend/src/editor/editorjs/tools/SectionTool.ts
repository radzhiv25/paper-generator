import type { SectionBlockData } from '../types'

type SectionConfig = {
  data?: SectionBlockData
}

export class SectionTool {
  private data: SectionBlockData
  private wrapper: HTMLElement | null = null

  static get toolbox() {
    return {
      title: 'Section',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h16"/></svg>',
    }
  }

  constructor({ data }: SectionConfig) {
    this.data = {
      sectionId: data?.sectionId ?? 'A',
      instructions: data?.instructions ?? '',
    }
  }

  render() {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'ej-section-block'

    const title = document.createElement('div')
    title.className = 'ej-section-title'
    title.textContent = 'Section'

    const idRow = document.createElement('div')
    idRow.className = 'ej-field-row'
    const idLabel = document.createElement('label')
    idLabel.textContent = 'Section ID'
    const idInput = document.createElement('input')
    idInput.className = 'ej-input ej-input-sm'
    idInput.value = this.data.sectionId
    idInput.placeholder = 'A'
    idInput.addEventListener('input', () => {
      this.data.sectionId = idInput.value
    })
    idRow.append(idLabel, idInput)

    const instrLabel = document.createElement('label')
    instrLabel.textContent = 'Instructions'
    const instrInput = document.createElement('textarea')
    instrInput.className = 'ej-textarea'
    instrInput.rows = 2
    instrInput.value = this.data.instructions
    instrInput.placeholder = 'All questions are compulsory...'
    instrInput.addEventListener('input', () => {
      this.data.instructions = instrInput.value
    })

    this.wrapper.append(title, idRow, instrLabel, instrInput)
    return this.wrapper
  }

  save(): SectionBlockData {
    return { ...this.data }
  }
}

export default SectionTool
