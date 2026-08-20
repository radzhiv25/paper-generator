declare module '@editorjs/editorjs' {
  export interface OutputData {
    time?: number
    blocks: Array<{
      id?: string
      type: string
      data: Record<string, unknown>
    }>
  }

  export interface EditorConfig {
    holder: HTMLElement | string
    autofocus?: boolean
    data?: OutputData
    tools?: Record<string, unknown>
    onChange?: () => void
  }

  export default class EditorJS {
    constructor(config: EditorConfig)
    readonly isReady: Promise<unknown>
    save(): Promise<OutputData>
    render(data: OutputData): Promise<void>
    destroy(): void
  }
}
