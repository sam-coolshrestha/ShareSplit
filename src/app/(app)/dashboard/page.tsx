import { redirect } from 'next/navigation'

import { Dashboard } from '@/components/dashboard/Dashboard'
import { createClient } from '@/lib/supabase/server'

type ExpenseShareRow = {
  expense_id: string
  amount: number | string | null
}

type ExpenseRowFromDb = {
  id: string
  description: string
  amount: number | string | null
  currency: string
  date: string
  groups: { name: string } | { name: string }[] | null
  payer: { display_name: string } | { display_name: string }[] | null
}

type RecentExpenseRow = {
  id: string
  description: string
  amount: number | string | null
  currency: string
  date: string
  groupName: string
  payerName: string
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

  const { data: shareRows } = await supabase
    .from('expense_splits')
    .select('expense_id, amount, expenses!inner(is_deleted)')
    .eq('user_id', user.id)
    .eq('expenses.is_deleted', false)

  const shareByExpenseId = new Map(
    ((shareRows ?? []) as ExpenseShareRow[]).map((row) => [row.expense_id, Number(row.amount ?? 0)])
  )

  const totalBalance = Array.from(shareByExpenseId.values()).reduce((sum, amount) => sum + amount, 0)

  const { data: recentExpenseRows } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      amount,
      currency,
      date,
      groups(name),
      payer:profiles!expenses_paid_by_fkey(display_name)
    `)
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(12)

  const recentExpenses = ((recentExpenseRows ?? []) as ExpenseRowFromDb[])
    .map((expense) => {
      const group = Array.isArray(expense.groups) ? expense.groups[0] : expense.groups
      const payer = Array.isArray(expense.payer) ? expense.payer[0] : expense.payer

      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        groupName: group?.name ?? 'Shared expense',
        payerName: payer?.display_name ?? 'Member',
      }
    })
    .filter((expense) => shareByExpenseId.has(expense.id))
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
