import { redirect } from 'next/navigation'

import { Dashboard } from '@/components/dashboard/Dashboard'
import { buildExpenseActivityItem, getSingle } from '@/lib/activity'
import { createClient } from '@/lib/supabase/server'
import { calculateNetBalanceForUser, type BalanceExpense, type BalanceSettlement } from '@/lib/utils/balance'

type ExpenseRowFromDb = {
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName =
    profile?.display_name ??
    user.user_metadata.full_name ??
    user.email?.split('@')[0] ??
    'there'

  const { data: invites } = await supabase
    .from('group_invites')
    .select(`
      id,
      created_at,
      group:groups!group_invites_group_id_fkey(name),
      inviter:profiles!group_invites_invited_by_fkey(display_name)
    `)
    .eq('invited_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: balanceExpenseRows } = await supabase
    .from('expenses')
    .select(`
      amount,
      paid_by,
      expense_splits!inner(
        user_id,
        amount
      )
    `)
    .eq('expense_splits.user_id', user.id)
    .eq('is_deleted', false)

  const { data: settlementRows } = await supabase
    .from('settlements')
    .select('payer_id, payee_id, amount')
    .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)

  const totalBalance = calculateNetBalanceForUser(
    user.id,
    (balanceExpenseRows ?? []) as BalanceExpense[],
    (settlementRows ?? []) as BalanceSettlement[]
  )

  const { data: recentExpenseRows } = await supabase
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
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(12)

  const recentExpenses = ((recentExpenseRows ?? []) as ExpenseRowFromDb[])
    .filter((expense) => (expense.expense_splits ?? []).some((split) => split.user_id === user.id))
    .map((expense) => {
      const group = getSingle(expense.groups)
      const payer = getSingle(expense.payer)
      const creator = getSingle(expense.creator)
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
    .slice(0, 6)

  return (
    <Dashboard
      displayName={displayName}
      totalBalance={totalBalance}
      recentExpenses={recentExpenses}
      invites={invites ?? []}
    />
  )
}
