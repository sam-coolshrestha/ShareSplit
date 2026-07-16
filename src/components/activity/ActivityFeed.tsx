'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { type ActivityItem, formatCurrency } from '@/lib/activity'

type ActivityFeedProps = {
  items: ActivityItem[]
  emptyTitle: string
  emptyDescription: string
  compact?: boolean
}

export function ActivityFeed({
  items,
  emptyTitle,
  emptyDescription,
  compact = false,
}: ActivityFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-2xl text-foreground">{emptyTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-light">{emptyDescription}</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const isExpanded = expandedId === item.id && !compact

        return (
          <Card key={item.id} className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => (!compact ? setExpandedId(isExpanded ? null : item.id) : undefined)}
              className="flex min-h-16 w-full flex-col items-start gap-4 px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl text-foreground">{item.title}</p>
                {item.payerText ? <p className="mt-1 truncate text-sm text-muted-light">{item.payerText}</p> : null}
                {item.yourShare !== undefined ? (
                  <p className="mt-1 text-sm text-muted-light">
                    Your share {formatCurrency(item.yourShare, item.currency)}
                  </p>
                ) : null}
                {item.yourDelta !== undefined && Math.abs(item.yourDelta) > 0.009 ? (
                  <p className={`mt-1 text-sm ${item.yourDelta > 0 ? 'text-success' : 'text-primary'}`}>
                    {item.yourDelta > 0
                      ? `Owed to you ${formatCurrency(item.yourDelta, item.currency)}`
                      : `You owe ${formatCurrency(Math.abs(item.yourDelta), item.currency)}`}
                  </p>
                ) : null}
              </div>

              <div className="min-w-20 shrink-0 text-left sm:text-right">
                {item.totalAmount !== undefined ? (
                  <p className="font-display text-3xl text-primary">
                    {formatCurrency(item.totalAmount, item.currency)}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted">{item.relativeTime}</p>
              </div>
            </button>

            {isExpanded ? <ExpandedActivityCard item={item} /> : null}
          </Card>
        )
      })}
    </div>
  )
}

function ExpandedActivityCard({ item }: { item: ActivityItem }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    if (!item.expenseId) return

    startTransition(async () => {
      setError(null)
      const { error: deleteError } = await supabase
        .from('expenses')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', item.expenseId)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      router.refresh()
    })
  }

  const sendReminder = (targetUserId: string) => {
    if (!item.expenseId) return

    startTransition(async () => {
      setError(null)
      const { error: reminderError } = await supabase.rpc('create_reminder_notification', {
        target_user_id: targetUserId,
        target_expense_id: item.expenseId,
      })

      if (reminderError) {
        setError(reminderError.message)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="border-t-[length:var(--border-width)] border-border bg-surface px-4 py-4">
      <div className="space-y-4">
        {item.createdByText ? <p className="text-sm text-muted-light">{item.createdByText}</p> : null}

        {item.participants?.length ? (
          <div>
            <p className="label">Split breakdown</p>
            <div className="mt-3 space-y-2">
              {item.participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-[inherit] border-[length:var(--border-width)] border-border bg-surface-raised px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{participant.name}</p>
                    {participant.owesText ? (
                      <p className="truncate text-xs text-muted-light">{participant.owesText}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(participant.share, item.currency)}
                    </p>
                    {participant.canSendReminder ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => sendReminder(participant.userId)}
                      >
                        Remind
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {item.note ? (
          <div>
            <p className="label">Notes</p>
            <p className="mt-2 text-sm leading-6 text-muted-light">{item.note}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {item.linkHref ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={item.linkHref}>{item.viewLabel ?? 'View details'}</Link>
            </Button>
          ) : null}
          {item.canDelete ? (
            <Button size="sm" variant="danger" disabled={isPending} onClick={handleDelete}>
              {isPending ? 'Deleting' : 'Delete'}
            </Button>
          ) : null}
        </div>

        {error ? <p className="text-xs text-error">{error}</p> : null}
      </div>
    </div>
  )
}
