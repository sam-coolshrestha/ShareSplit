import { redirect } from 'next/navigation'

import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { Badge } from '@/components/ui/Badge'
import { buildExpenseActivityItem, buildNotificationActivityItem, getSingle } from '@/lib/activity'
import { createClient } from '@/lib/supabase/server'

type ExpenseRow = {
  id: string
  description: string
  amount: number | string | null
  currency: string
  date: string
  created_at: string
  updated_at: string
  created_by: string
  paid_by: string
  notes: string | null
  is_deleted: boolean
  group_id: string | null
  friendship_id: string | null
  groups: { name: string } | { name: string }[] | null
  payer: { display_name: string } | { display_name: string }[] | null
  creator: { display_name: string } | { display_name: string }[] | null
  expense_splits: Array<{
    user_id: string
    amount: number | string | null
    profile: { display_name: string } | { display_name: string }[] | null
  }> | null
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: expenseRows } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      amount,
      currency,
      date,
      created_at,
      updated_at,
      created_by,
      paid_by,
      notes,
      is_deleted,
      group_id,
      friendship_id,
      groups(name),
      payer:profiles!expenses_paid_by_fkey(display_name),
      creator:profiles!expenses_created_by_fkey(display_name),
      expense_splits(
        user_id,
        amount,
        profile:profiles(display_name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(40)

  const { data: notificationRows } = await supabase
    .from('notifications')
    .select('id, type, title, body, link_href, created_at')
    .eq('user_id', user.id)
    .in('type', ['settlement_completed', 'reminder_sent', 'balance_update', 'group_created', 'friend_added', 'added_to_group'])
    .order('created_at', { ascending: false })
    .limit(20)

  const expenseItems = ((expenseRows ?? []) as ExpenseRow[])
    .filter((expense) => (expense.expense_splits ?? []).some((split) => split.user_id === user.id))
    .map((expense) => {
      const payer = getSingle(expense.payer)
      const creator = getSingle(expense.creator)
      const group = getSingle(expense.groups)
      const participantNames = new Map(
        (expense.expense_splits ?? []).map((split) => [
          split.user_id,
          getSingle(split.profile)?.display_name ?? 'Member',
        ])
      )

      return buildExpenseActivityItem(
        {
          ...expense,
          payerName: payer?.display_name ?? 'Member',
          creatorName: creator?.display_name ?? 'Member',
          contextName: group?.name ?? null,
          contextHref: expense.group_id
            ? `/groups/${expense.group_id}`
            : expense.friendship_id
              ? `/friends/${expense.friendship_id}`
              : '/dashboard',
          contextLabel: expense.group_id ? 'View group' : expense.friendship_id ? 'View friend' : 'View details',
          participantNames,
        },
        user.id
      )
    })

  const notificationItems = (notificationRows ?? []).map(buildNotificationActivityItem)
  const items = [...expenseItems, ...notificationItems].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  )

  return (
    <div className="page-shell space-y-6">
      <section className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="primary">Activity</Badge>
          <h1 className="mt-4 font-display text-4xl text-foreground sm:text-5xl">Recent activity</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            Real expenses, shares, reminders, and balance changes in one running feed.
          </p>
        </div>
      </section>

      <ActivityFeed
        items={items}
        emptyTitle="No activity yet"
        emptyDescription="Once you start adding shared expenses, the latest activity will show up here."
      />
    </div>
  )
}
