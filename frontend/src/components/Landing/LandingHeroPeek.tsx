import { motion } from 'framer-motion'
import katex from 'katex'
import {
  AlignLeft,
  Bold,
  Check,
  FileText,
  Home,
  Italic,
  LayoutTemplate,
  Plus,
  Settings,
  Sparkles,
  Type,
  Underline,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '../AppLogo'
import { cn } from '@/lib/utils'
import type { ContentBlock } from '../../editor/schema'
import { previewContextDoc, previewPaper, previewPrompt } from './landingPreviewData'

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

export function LandingHeroPeek() {
  const sectionA = previewPaper.sections[0]
  const q1 = sectionA.questions[0]
  const q2 = sectionA.questions[1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="hero-peek-shell relative h-[400px] w-full overflow-hidden sm:h-[480px] lg:h-[560px] xl:h-[620px]"
      aria-hidden
    >
      <div className="hero-peek-window absolute left-2 top-4 w-[680px] sm:left-4 sm:top-6 sm:w-[760px] lg:left-5 lg:top-8 lg:w-[920px]">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-[0_28px_90px_rgb(0_0_0_/_0.16)] dark:border-white/10 dark:bg-card dark:shadow-[0_28px_90px_rgb(0_0_0_/_0.5)]">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <span className="ml-2 truncate text-xs text-muted-foreground">
              app.papercue.local — Physics — Class XII
            </span>
          </div>

          <div className="flex h-[620px]">
            {/* Sidebar */}
            <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-panel">
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
                        'flex items-center gap-2 rounded-md px-2.5 py-2 text-xs',
                        item.active
                          ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
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
                <div className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-muted-foreground">
                  <Settings className="size-3.5" />
                  Settings
                </div>
              </div>
            </aside>

            {/* Editor */}
            <div className="flex min-w-0 flex-1 flex-col bg-[#e8eaed] dark:bg-[#1a1c1f]">
              <div className="border-b border-border bg-white px-4 py-2.5 dark:bg-card">
                <p className="text-sm font-normal text-[#202124] dark:text-foreground">
                  {previewPaper.metadata.subject}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {previewPaper.metadata.grade_class} · {previewPaper.metadata.total_marks} marks ·{' '}
                  {previewPaper.metadata.duration}
                </p>
              </div>

              <div className="flex items-center gap-1 border-b border-border bg-[#fafbfc] px-3 py-1.5 dark:bg-muted/30">
                {[Plus, Bold, Italic, Underline, AlignLeft, Type].map((Icon, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md text-muted-foreground',
                      i === 1 && 'bg-muted text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-hidden p-5">
                <div className="doc-page hero-peek-page mx-auto shadow-md">
                  <div className="hero-peek-doc">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      Section {sectionA.section_id}
                    </p>
                    <p className="mb-4 text-[11px] italic text-gray-500">{sectionA.instructions}</p>

                    <div className="mb-4 rounded border border-transparent px-2 py-2">
                      <div className="mb-1.5 flex gap-2 text-[10px] text-gray-500">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{q1.q_id}.</span>
                        <span>(1 mark)</span>
                        <span className="uppercase">{q1.type}</span>
                      </div>
                      <p
                        className="text-xs text-[#202124] dark:text-gray-100"
                        dangerouslySetInnerHTML={{ __html: renderBlocks(q1.content) }}
                      />
                      {q1.options && (
                        <ul className="mt-2 ml-5 list-disc text-[11px] text-gray-700 dark:text-gray-300">
                          {q1.options.slice(0, 2).map((opt) => (
                            <li key={opt}>{opt}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded border border-[rgb(26_115_232_/_0.45)] bg-[rgb(26_115_232_/_0.06)] px-2 py-2">
                      <div className="mb-1.5 flex gap-2 text-[10px] text-gray-500">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{q2.q_id}.</span>
                        <span>(1 mark)</span>
                        <span className="uppercase">{q2.type}</span>
                      </div>
                      <p
                        className="text-xs text-[#202124] dark:text-gray-100"
                        dangerouslySetInnerHTML={{ __html: renderBlocks(q2.content) }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prompt panel — partially clipped on the right */}
            <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-panel">
              <div className="border-b border-border p-3">
                <h3 className="text-xs font-semibold">Prompt</h3>
                <p className="text-[11px] text-muted-foreground">Describe the paper you want.</p>
              </div>
              <div className="flex border-b border-border text-[11px]">
                <span className="flex-1 border-b-2 border-brand-600 py-2 text-center font-medium text-brand-700 dark:text-brand-400">
                  Paper
                </span>
                <span className="flex-1 py-2 text-center text-muted-foreground">Answer Key</span>
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <p className="mb-1 text-[11px] font-medium">Syllabus context</p>
                  <div className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
                    {previewContextDoc.filename}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-green-700 dark:text-green-400">
                    <Check className="size-3" />
                    {previewContextDoc.chunk_count} chunks indexed
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium">Generation prompt</p>
                  <div className="rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed">
                    {previewPrompt.slice(0, 120)}…
                  </div>
                </div>
                <Button size="sm" className="h-8 w-full gap-1 text-xs" disabled tabIndex={-1}>
                  <Sparkles className="size-3.5" />
                  Generate paper
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Edge fades so the crop feels intentional */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface via-surface/80 to-transparent dark:from-[oklch(0.13_0.01_280)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface via-surface/70 to-transparent dark:from-[oklch(0.13_0.01_280)]" />
    </motion.div>
  )
}
