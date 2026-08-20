import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createPaper, getTemplates } from '../../api/papers'
import type { Template } from '../../editor/schema'

interface TemplatesListProps {
  onSelectTemplate: (paperId: string) => void
}

export function TemplatesList({ onSelectTemplate }: TemplatesListProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    getTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (templateId: string) => {
    setCreating(templateId)
    try {
      const paper = await createPaper(templateId)
      onSelectTemplate(paper.paper_id)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-2xl font-semibold">Templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a format for your question paper.
        </p>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading templates…
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {templates.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer transition hover:border-brand-500 hover:shadow-md"
                onClick={() => !creating && void handleSelect(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) void handleSelect(t.id)
                }}
              >
                <CardHeader>
                  <Badge variant="secondary" className="w-fit bg-brand-50 text-brand-700">
                    {t.type}
                  </Badge>
                  <CardTitle>{t.name}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                {creating === t.id && (
                  <CardContent className="pt-0">
                    <p className="flex items-center gap-1 text-xs text-brand-600">
                      <Loader2 className="size-3 animate-spin" />
                      Creating…
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
