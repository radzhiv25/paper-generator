import { useEffect, useState } from 'react'
import { AlertTriangle, FilePlus, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createPaper } from '../../api/papers'
import { getRecentPapers } from '../../api/papers'
import type { RecentPaperSummary } from '../../editor/schema'
import { isUsingMockBackend } from '../../api/papers'

interface DashboardProps {
  onOpenPaper: (paperId: string) => void
  onNewPaper: (paperId: string) => void
}

export function Dashboard({ onOpenPaper, onNewPaper }: DashboardProps) {
  const [recent, setRecent] = useState<RecentPaperSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentPapers()
      .then(setRecent)
      .finally(() => setLoading(false))
  }, [])

  const handleNew = async () => {
    const paper = await createPaper('general')
    onNewPaper(paper.paper_id)
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create AI-powered question papers with a Word-like editing experience.
        </p>

        {isUsingMockBackend() && (
          <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="text-amber-600" />
            <AlertDescription>
              Backend unavailable — using mock data. Start the API at{' '}
              <code className="rounded bg-amber-100 px-1">localhost:8000</code> for live mode.
            </AlertDescription>
          </Alert>
        )}

        <Button type="button" onClick={() => void handleNew()} className="mt-6">
          <FilePlus />
          New Paper
        </Button>

        <section className="mt-10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Papers
          </h3>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : recent.length === 0 ? (
            <Card className="mt-4 border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No papers yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create your first paper or pick a template to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((p) => (
                <li key={p.paper_id}>
                  <button
                    type="button"
                    onClick={() => onOpenPaper(p.paper_id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-brand-500 hover:shadow-sm"
                  >
                    <div>
                      <p className="font-medium">{p.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.grade_class} · {p.total_marks} marks · {p.template_id}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
