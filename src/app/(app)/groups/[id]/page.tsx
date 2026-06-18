import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { InviteMemberForm } from '@/components/groups/InviteMemberForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

type GroupDetailPageProps = {
  params: {
    id: string
  }
}

type GroupExpenseRow = {
  id: string
  description: string
  amount: number | string | null
  currency: string
  date: string
  paid_by: string
  profiles: { display_name: string } | { display_name: string }[] | null
  expense_splits: Array<{
    user_id: string
    amount: number | string | null
    profiles: { display_name: string } | { display_name: string }[] | null
  }> | null
}

type GroupMemberRow = {
  user_id: string
  profiles: { display_name: string } | { display_name: string }[] | null
}

function getProfileName(
  profile: { display_name: string } | { display_name: string }[] | null,
  fallback = 'Member'
) {
  if (!profile) return fallback
  return Array.isArray(profile) ? profile[0]?.display_name ?? fallback : profile.display_name
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, description, currency, created_at, group_members(count)')
    .eq('id', params.id)
    .maybeSingle()

  if (!group) notFound()

  const memberCount = group.group_members?.[0]?.count ?? 0

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name)')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true })

  const members = ((memberRows ?? []) as GroupMemberRow[]).map((member) => ({
    id: member.user_id,
    name: getProfileName(member.profiles),
  }))

  const memberMap = new Map(members.map((member) => [member.id, member.name]))

  const { data: expenseRows } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      amount,
      currency,
      date,
      paid_by,
      profiles!expenses_paid_by_fkey(display_name),
      expense_splits(
        user_id,
        amount,
        profiles(display_name)
      )
    `)
    .eq('group_id', group.id)
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const groupExpenses = (expenseRows ?? []) as GroupExpenseRow[]
  const expenseCount = groupExpenses.length
  const totalSpent = groupExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)

  const netByMember = new Map<string, number>()

  for (const expense of groupExpenses) {
    const payerId = expense.paid_by
    const splits = expense.expense_splits ?? []

    for (const split of splits) {
      const shareAmount = Number(split.amount ?? 0)

      if (split.user_id === user.id && payerId !== user.id) {
        netByMember.set(payerId, (netByMember.get(payerId) ?? 0) - shareAmount)
      }

      if (payerId === user.id && split.user_id !== user.id) {
        netByMember.set(split.user_id, (netByMember.get(split.user_id) ?? 0) + shareAmount)
      }
    }
  }

  const balances = Array.from(netByMember.entries())
    .map(([memberId, amount]) => ({
      memberId,
      name: memberMap.get(memberId) ?? 'Member',
      amount,
    }))
    .filter((entry) => Math.abs(entry.amount) > 0.009)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">{group.currency}</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">{group.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            {group.description || 'Track who owes whom, what has been spent, and every activity in one place.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="secondary">
            <Link href="/groups">
              <ArrowLeftIcon className="h-4 w-4" />
              Groups
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="#members">
              <UsersIcon className="h-4 w-4" />
              Members
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/groups/${group.id}/expenses/new`}>
              <PlusIcon className="h-4 w-4" />
              Add expense
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card priority className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Group balance</p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Who owes you, and who you owe</h2>
            </div>
            <Badge variant="primary">{balances.length}</Badge>
          </div>

          <div className="mt-6 space-y-3">
            {balances.length > 0 ? (
              balances.map((balance) => {
                const isOwedToYou = balance.amount > 0

                return (
                  <div
                    key={balance.memberId}
                    className="theme-card flex items-center justify-between gap-4 bg-surface-raised px-4 py-4"
                  >
                    <div>
                      <p className="font-display text-2xl text-foreground">{balance.name}</p>
                      <p className="mt-1 text-sm text-muted-light">
                        {isOwedToYou ? `${balance.name} owes you` : `You owe ${balance.name}`}
                      </p>
                    </div>
                    <p className={`font-display text-3xl ${isOwedToYou ? 'text-success' : 'text-primary'}`}>
                      {formatCurrency(Math.abs(balance.amount), group.currency)}
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="theme-card bg-surface-raised px-4 py-6 text-sm text-muted-light">
                You are settled up with everyone in this group right now.
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">Total spent</p>
            <p className="mt-3 font-display text-4xl text-primary">{formatCurrency(totalSpent, group.currency)}</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">Expenses</p>
            <p className="mt-3 font-display text-4xl text-primary">{expenseCount}</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">Members</p>
            <p className="mt-3 font-display text-4xl text-primary">{memberCount}</p>
          </Card>
        </div>
      </div>

      <section id="members" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">People</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Group members</h2>
          </div>
          <Badge variant="primary">{memberCount}</Badge>
        </div>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-3">
            {members.map((member) => (
              <div key={member.id} className="theme-chip px-4 py-3 text-sm font-bold text-foreground">
                {member.name}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Activity</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Everything happening in this group</h2>
          </div>
          <Badge variant="primary">{expenseCount}</Badge>
        </div>

        <Card priority className="comic-halftone relative overflow-hidden p-5 sm:p-6">
          <div className="relative z-10 space-y-3">
            {groupExpenses.length > 0 ? (
              groupExpenses.map((expense) => {
                const payerName = getProfileName(expense.profiles)
                const userShareRow = (expense.expense_splits ?? []).find((split) => split.user_id === user.id)
                const userShare = Number(userShareRow?.amount ?? 0)
                const youPaid = expense.paid_by === user.id
                const summary =
                  userShare > 0
                    ? youPaid
                      ? 'You paid for this split'
                      : `You owe ${payerName}`
                    : 'You were not included in this split'

                return (
                  <div
                    key={expense.id}
                    className="theme-card flex flex-col gap-4 bg-surface-raised px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex gap-4">
                      <div className="theme-chip flex min-w-16 flex-col items-center justify-center px-3 py-2 text-center">
                        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                          {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(expense.date))}
                        </span>
                        <span className="font-display text-2xl text-foreground">
                          {new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(new Date(expense.date))}
                        </span>
                      </div>

                      <div>
                        <p className="font-display text-2xl text-foreground">{expense.description}</p>
                        <p className="mt-1 text-sm text-muted-light">
                          {payerName} paid {formatCurrency(Number(expense.amount ?? 0), expense.currency || group.currency)}
                        </p>
                        <p className="mt-1 text-sm text-muted-light">{summary}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Your share</p>
                      <p className="mt-2 font-display text-3xl text-primary">
                        {formatCurrency(userShare, expense.currency || group.currency)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="theme-card bg-surface-raised px-4 py-8 text-center">
                <h3 className="font-display text-3xl text-foreground">No activity yet</h3>
                <p className="mt-3 text-sm leading-6 text-muted-light">
                  Add the first expense and the group timeline will start filling in here.
                </p>
                <Button asChild className="mt-6">
                  <Link href={`/groups/${group.id}/expenses/new`}>
                    <PlusIcon className="h-4 w-4" />
                    Add first expense
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </Card>
      </section>

      {membership?.role === 'admin' ? (
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <Badge variant="primary">Admin</Badge>
            <h2 className="mt-4 font-display text-3xl text-foreground">Invite a member</h2>
            <p className="mt-2 text-sm leading-6 text-muted-light">
              They will appear in the group only after accepting the invitation.
            </p>
          </div>
          <InviteMemberForm groupId={group.id} />
        </Card>
      ) : null}
    </div>
  )
}

type IconProps = {
  className?: string
}

function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8a3 3 0 0 1 0 6M24 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}
