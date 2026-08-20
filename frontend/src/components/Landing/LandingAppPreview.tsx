import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import katex from 'katex'
import {
  AlignLeft,
  Bold,
  Check,
  Download,
  FileText,
  Home,
  Italic,
  LayoutTemplate,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Type,
  Underline,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppLogo } from '../AppLogo'
import { cn } from '@/lib/utils'
import type { ContentBlock } from '../../editor/schema'
import {
  previewAnswerKey,
  previewContextDoc,
  previewPaper,
  previewPrompt,
  previewTabs,
  type PreviewTab,
} from './landingPreviewData'

function renderBlocks(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'equation') {
        try {
          return katex.renderToString(b.value, { throwOnError: false })
        } catch {
          return b.value
        }
      }
      return b.value
    })
    .join('')
}

function BrowserChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-app-frame overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_24px_80px_rgb(124_58_237_/_0.18)] dark:bg-card dark:shadow-[0_24px_80px_rgb(0_0_0_/_0.45)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400/90" />
        <span className="size-2.5 rounded-full bg-amber-400/90" />
        <span className="size-2.5 rounded-full bg-green-400/90" />
        <span className="ml-3 text-xs text-muted-foreground">app.papercue.local — Physics — Class XII</span>
      </div>
      {children}
    </div>
  )
}

function MockSidebar() {
  return (
    <aside className="hidden w-44 shrink-0 flex-col border-r border-border bg-panel sm:flex">
      <div className="border-b border-border px-3 py-3">
        <AppLogo size="sm" showTagline />
      </div>
      <nav className="space-y-0.5 p-2">
        {[
          { label: 'Home', icon: Home, active: false },
          { label: 'Templates', icon: LayoutTemplate, active: false },
          { label: 'Recent', icon: FileText, active: true },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                item.active
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </div>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-border p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
          <Settings className="size-3.5" />
          Settings
        </div>
      </div>
    </aside>
  )
}

function MockToolbar() {
  const icons = [Plus, Bold, Italic, Underline, AlignLeft, Type]
  return (
    <div className="flex items-center gap-1 border-b border-border bg-[#fafbfc] px-2 py-1">
      {icons.map((Icon, i) => (
        <div
          key={i}
          className={cn(
            'flex size-7 items-center justify-center rounded-md text-muted-foreground',
            i === 1 && 'bg-muted text-foreground',
          )}
        >
          <Icon className="size-3.5" />
        </div>
      ))}
    </div>
  )
}

function MockDocumentView() {
  const sectionA = previewPaper.sections[0]
  const sectionB = previewPaper.sections[1]

  return (
    <div className="flex h-full flex-col bg-[#e8eaed]">
      <div className="border-b border-border bg-white px-4 py-2">
        <p className="truncate text-sm font-normal text-[#202124]">{previewPaper.metadata.subject}</p>
        <p className="text-[10px] text-muted-foreground">
          {previewPaper.metadata.grade_class} · {previewPaper.metadata.total_marks} marks ·{' '}
          {previewPaper.metadata.duration}
        </p>
      </div>
      <MockToolbar />
      <div className="flex-1 overflow-hidden p-4">
        <div className="doc-page landing-preview-page mx-auto shadow-md">
          <div className="landing-preview-doc text-[10px] leading-relaxed">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-gray-600">
              Section {sectionA.section_id}
            </p>
            <p className="mb-4 text-[9px] italic text-gray-500">{sectionA.instructions}</p>
            {sectionA.questions.slice(0, 2).map((q, qi) => (
              <div
                key={q.q_id}
                className={cn(
                  'mb-3 rounded border px-2 py-1.5',
                  qi === 1
                    ? 'border-[rgb(26_115_232_/_0.45)] bg-[rgb(26_115_232_/_0.06)]'
                    : 'border-transparent',
                )}
              >
                <div className="mb-1 flex gap-2 text-[8px] text-gray-500">
                  <span className="font-semibold text-gray-800">{q.q_id}.</span>
                  <span>({q.marks} mark{q.marks === 1 ? '' : 's'})</span>
                  <span className="uppercase">{q.type}</span>
                </div>
                <p
                  className="text-[10px] text-[#202124]"
                  dangerouslySetInnerHTML={{ __html: renderBlocks(q.content) }}
                />
                {q.options && (
                  <ul className="mt-1.5 ml-4 list-disc text-[9px] text-gray-700">
                    {q.options.map((opt) => (
                      <li key={opt}>{opt}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-wider text-gray-600">
              Section {sectionB.section_id}
            </p>
            <div className="rounded border border-transparent px-2 py-1.5">
              <div className="mb-1 flex gap-2 text-[8px] text-gray-500">
                <span className="font-semibold text-gray-800">{sectionB.questions[0].q_id}.</span>
                <span>(5 marks)</span>
                <span className="uppercase">numerical</span>
              </div>
              <p
                className="text-[10px]"
                dangerouslySetInnerHTML={{
                  __html: renderBlocks(sectionB.questions[0].content),
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-white px-3 py-1 text-[10px] text-muted-foreground">
        <span>248 words · 5 questions</span>
        <span className="text-brand-600">A2 selected · ⌘K to AI-edit</span>
      </div>
    </div>
  )
}

function MockAnswerKeyView() {
  const answers = previewAnswerKey.answers.slice(0, 3)

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Answer key</h3>
        <p className="text-xs text-muted-foreground">Linked to {previewPaper.metadata.subject}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {answers.map((entry) => (
          <div key={entry.q_id} className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {entry.q_id}
              </Badge>
              <span className="text-xs text-muted-foreground">Answer</span>
            </div>
            <div
              className="text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderBlocks(entry.answer) }}
            />
            {entry.explanation && (
              <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                {entry.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MockPromptPanel({ highlighted }: { highlighted: boolean }) {
  return (
    <aside
      className={cn(
        'flex w-52 shrink-0 flex-col border-l border-border bg-panel transition-shadow sm:w-56',
        highlighted && 'relative z-10 shadow-[-8px_0_24px_rgb(124_58_237_/_0.12)] ring-2 ring-brand-500/30 ring-inset',
      )}
    >
      <div className="border-b border-border p-3">
        <h3 className="text-xs font-semibold">Prompt</h3>
        <p className="text-[10px] text-muted-foreground">Describe the paper you want.</p>
      </div>
      <div className="flex border-b border-border text-[10px]">
        <span className="flex-1 border-b-2 border-brand-600 py-1.5 text-center font-medium text-brand-700">
          Paper
        </span>
        <span className="flex-1 py-1.5 text-center text-muted-foreground">Answer Key</span>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3">
        <div>
          <p className="mb-1 text-[10px] font-medium">Syllabus context</p>
          <div className="rounded-md border border-border bg-background px-2 py-1.5 text-[10px]">
            {previewContextDoc.filename}
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-green-700">
            <Check className="size-3" />
            {previewContextDoc.chunk_count} chunks indexed
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium">Generation prompt</p>
          <div className="min-h-[7rem] rounded-md border border-border bg-background p-2 text-[10px] leading-relaxed text-foreground/90">
            {previewPrompt}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-2 text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">Est. ~2.4k tokens</span>
          <span className="mx-1">·</span>
          Ollama · local
        </div>
        <Button size="sm" className="h-8 w-full gap-1 text-xs" disabled>
          <Sparkles className="size-3.5" />
          Generate paper
        </Button>
      </div>
    </aside>
  )
}

function MockExportBar({ highlighted }: { highlighted: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-t border-border bg-muted/50 px-4 py-2 transition-shadow',
        highlighted && 'bg-brand-50/80 shadow-[inset_0_0_0_2px_rgb(124_58_237_/_0.25)]',
      )}
    >
      <span className="text-xs font-medium">Export</span>
      <div className="flex rounded-lg border border-border bg-background p-0.5 text-[10px]">
        <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground">DOCX</span>
        <span className="px-2 py-0.5 text-muted-foreground">PDF</span>
      </div>
      <div className="flex rounded-lg border border-border bg-background p-0.5 text-[10px]">
        <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground">Both</span>
        <span className="px-2 py-0.5 text-muted-foreground">Paper</span>
        <span className="px-2 py-0.5 text-muted-foreground">Key</span>
      </div>
      <Button size="sm" className="ml-auto h-7 gap-1 text-xs" disabled>
        {highlighted ? <Download className="size-3.5" /> : <Loader2 className="size-3.5" />}
        Download
      </Button>
    </div>
  )
}

export function LandingAppPreview({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<PreviewTab>('editor')
  const activeMeta = previewTabs.find((t) => t.id === tab)!
  const displayTab = compact ? 'editor' : tab

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-wrap gap-2">
          {previewTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                tab === item.id
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-border bg-white/80 text-muted-foreground hover:border-brand-300 hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {!compact && <p className="text-sm text-muted-foreground">{activeMeta.description}</p>}

      <BrowserChrome>
        <div className={cn('flex min-h-[360px]', compact ? 'h-[340px]' : 'h-[min(520px,62vh)]')}>
          <MockSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayTab === 'answer_key' ? 'answer_key' : 'editor'}
                initial={compact ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={compact ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {displayTab === 'answer_key' ? <MockAnswerKeyView /> : <MockDocumentView />}
              </motion.div>
            </AnimatePresence>
            {(displayTab === 'editor' || displayTab === 'export' || displayTab === 'generate') && (
              <MockExportBar highlighted={displayTab === 'export'} />
            )}
          </div>
          <MockPromptPanel highlighted={displayTab === 'generate'} />
        </div>
      </BrowserChrome>
    </div>
  )
}
