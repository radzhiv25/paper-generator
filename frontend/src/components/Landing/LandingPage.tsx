import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  FileText,
  KeyRound,
  PencilLine,
  Sparkles,
  Upload,
} from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '../../state/AuthContext'
import { LandingHeroPeek } from './LandingHeroPeek'
import { LandingAppPreview } from './LandingAppPreview'
import { LandingNavbar } from './LandingNavbar'
import { workflowSteps } from './landingPreviewData'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

const features = [
  {
    title: 'Generate from a syllabus PDF',
    body: 'Upload context, retrieve the relevant chunks, and draft a full paper in one pass.',
    icon: Upload,
    tall: true,
  },
  {
    title: 'Word-like editor',
    body: 'TipTap canvas with sections, marks, and print-style pages — not a spreadsheet of prompts.',
    icon: FileText,
    tall: false,
  },
  {
    title: 'Targeted AI edits',
    body: 'Select one question, describe the change, leave the rest of the paper intact.',
    icon: PencilLine,
    tall: false,
  },
  {
    title: 'Linked answer key',
    body: 'Every question id stays wired to its answer so export and review stay in sync.',
    icon: Sparkles,
    tall: true,
  },
  {
    title: 'BYOK or local models',
    body: 'OpenRouter, Anthropic, or Ollama on your machine. You keep the keys.',
    icon: KeyRound,
    tall: false,
  },
]

const faqs = [
  {
    q: 'Do I need an API key to try this?',
    a: 'Guest mode works against a local or mock backend. For hosted models, paste a key in Settings (BYOK) or run Ollama locally.',
  },
  {
    q: 'What happens to uploaded PDFs?',
    a: 'We extract and chunk text for retrieval, keep a library of your documents, and attach one syllabus to a paper so regenerate and question edits can reuse it.',
  },
  {
    q: 'Can I edit after generation?',
    a: 'Yes. Type in the document like Word, or use ⌘K / Ctrl+K on a selected question for a scoped AI rewrite.',
  },
  {
    q: 'What can I export?',
    a: 'Word and PDF for the paper, the answer key, or both — from the bar under the canvas.',
  },
]

export function LandingPage() {
  const { user, loading } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  if (!loading && user) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="landing-root relative min-h-full overflow-x-hidden bg-surface text-foreground">
      <LandingNavbar />

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl flex-col justify-center px-6 py-16 md:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 xl:gap-16">
            <motion.div
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.08 }}
              className="relative z-10"
            >
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600"
              >
                For teachers who still care about the paper
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-6xl xl:text-[3.75rem]"
              >
                Exam papers that feel written, not generated.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:mt-7 md:text-lg"
              >
                PaperCue turns a syllabus PDF and a prompt into a structured question paper you can edit like a
                document — then export with a linked answer key.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3 md:mt-12">
                <Link to="/auth" className={cn(buttonVariants({ size: 'lg' }))}>
                  Get started
                </Link>
                <Link to="/auth" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
                  Sign in
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="relative lg:-mr-8 xl:-mr-16"
            >
              <LandingHeroPeek />
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Inside the app
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              The same UI you&apos;ll use after sign-in
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Switch tabs to explore the document editor, AI prompt panel, linked answer key, and export bar —
              built from the real PaperCue layout, not a generic mockup.
            </p>
          </motion.div>
          <LandingAppPreview />
        </section>

        <section className="border-y border-border/70 bg-white/60 px-6 py-16 backdrop-blur-sm dark:bg-card/40">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              How it works
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {workflowSteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm dark:bg-card"
                >
                  <span className="text-3xl font-bold text-brand-200">{step.step}</span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            What you get
          </motion.h2>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.article
                  key={feature.title}
                  className="masonry-card mb-4 break-inside-avoid rounded-2xl border border-border/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-card/80"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  whileHover={{ y: -4, boxShadow: '0 12px 40px rgb(124 58 237 / 0.12)' }}
                >
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className={`mt-2 text-sm text-muted-foreground ${feature.tall ? 'leading-relaxed' : ''}`}>
                    {feature.body}
                  </p>
                </motion.article>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Ready to draft your next paper?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Guest mode works without Supabase. Attach a syllabus, generate, edit, and export in minutes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/auth" className={cn(buttonVariants({ size: 'lg' }))}>
                Open PaperCue
              </Link>
              <Link to="/auth" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
                Continue as guest
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">FAQ</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-white/80 dark:bg-card/80">
            {faqs.map((item, i) => {
              const open = openFaq === i
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    {item.q}
                    <ChevronDown className={`size-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <p className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/70 bg-white/50 px-6 py-8 dark:bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <AppLogo size="sm" />
          <Link to="/auth" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}
