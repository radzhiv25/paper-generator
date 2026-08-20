import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getRecentPapers } from '../../api/papers'
import type { RecentPaperSummary } from '../../editor/schema'

interface RecentPapersProps {
  onOpenPaper: (paperId: string) => void
}

export function RecentPapers({ onOpenPaper }: RecentPapersProps) {
  const [papers, setPapers] = useState<RecentPaperSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentPapers()
      .then(setPapers)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-2xl font-semibold">Recent Papers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your recently edited question papers.</p>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : papers.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No recent papers.
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 space-y-2">
            {papers.map((p) => (
              <li key={p.paper_id}>
                <button
                  type="button"
                  onClick={() => onOpenPaper(p.paper_id)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-brand-500"
                >
                  <div>
                    <p className="font-medium">{p.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.grade_class} · {p.total_marks} marks
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleString()}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
