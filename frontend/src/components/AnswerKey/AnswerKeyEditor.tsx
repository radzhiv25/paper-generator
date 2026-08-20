import { useCallback, useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveAnswerKey } from '../../api/papers'
import type { AnswerEntry, ContentBlock } from '../../editor/schema'
import { allQuestionIds } from '../../editor/schema'
import katex from 'katex'
import { usePaper } from '../../state/PaperContext'

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

export function AnswerKeyEditor() {
  const { paper, answerKey, updateAnswerKey, paperSyncKey } = usePaper()
  const [saving, setSaving] = useState(false)
  const [dirtyAnswers, setDirtyAnswers] = useState<{
    syncKey: number
    answers: AnswerEntry[]
  } | null>(null)

  const mergedAnswers = useMemo(() => {
    if (!answerKey || !paper) return []
    const qIds = allQuestionIds(paper)
    return qIds.map((qId) => {
      const existing = answerKey.answers.find((a) => a.q_id === qId)
      return (
        existing ?? {
          q_id: qId,
          answer: [{ type: 'text' as const, value: '' }],
        }
      )
    })
  }, [answerKey, paper])

  const localAnswers =
    dirtyAnswers?.syncKey === paperSyncKey ? dirtyAnswers.answers : mergedAnswers

  const handleChange = useCallback(
    (qId: string, field: 'answer' | 'explanation', value: string) => {
      setDirtyAnswers((prev) => {
        const base =
          prev?.syncKey === paperSyncKey ? prev.answers : mergedAnswers
        return {
          syncKey: paperSyncKey,
          answers: base.map((entry) => {
          if (entry.q_id !== qId) return entry
          if (field === 'explanation') {
            return { ...entry, explanation: value }
          }
          return {
            ...entry,
            answer: [{ type: 'text', value }],
          }
        }),
        }
      })
    },
    [mergedAnswers, paperSyncKey],
  )

  const handleSave = async () => {
    if (!paper) return
    const key = { paper_id: paper.paper_id, answers: localAnswers }
    updateAnswerKey(key)
    setSaving(true)
    try {
      await saveAnswerKey(key)
    } finally {
      setSaving(false)
    }
  }

  if (!paper) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No paper loaded.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <div>
          <h2 className="text-lg font-semibold">Answer Key</h2>
          <p className="text-xs text-muted-foreground">
            Linked by question ID — edits here do not change the paper.
          </p>
        </div>
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? 'Saving…' : 'Save Answers'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {localAnswers.map((entry) => {
            const question = paper.sections
              .flatMap((s) => s.questions)
              .find((q) => q.q_id === entry.q_id)
            return (
              <Card key={entry.q_id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant="secondary" className="bg-brand-50 text-brand-700">
                        {entry.q_id}
                      </Badge>
                      {question && (
                        <p
                          className="mt-2 text-sm text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: renderBlocks(question.content),
                          }}
                        />
                      )}
                    </div>
                    {question && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {question.marks} mark{question.marks === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`answer-${entry.q_id}`} className="text-xs">
                      Answer
                    </Label>
                    <Textarea
                      id={`answer-${entry.q_id}`}
                      value={entry.answer.map((b) => b.value).join('')}
                      onChange={(e) => handleChange(entry.q_id, 'answer', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="mt-2 space-y-2">
                    <Label htmlFor={`explanation-${entry.q_id}`} className="text-xs">
                      Explanation (optional)
                    </Label>
                    <Input
                      id={`explanation-${entry.q_id}`}
                      value={entry.explanation ?? ''}
                      onChange={(e) =>
                        handleChange(entry.q_id, 'explanation', e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
