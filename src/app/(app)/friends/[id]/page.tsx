import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { FriendshipSettleUpModal } from '@/components/friends/FriendshipSettleUpModal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'
import { calculateMemberBalances, describeNetBalance } from '@/lib/utils/balance'
import { simplifyDebts } from '@/lib/utils/debt-simplification'

type FriendPageProps = {
  params: {
    id: string
  }
}

type FriendshipRow = {
  id: string
  user_a: string
  user_b: string
  friend_a: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null
  friend_b: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null
}

type ExpenseRow = {
  id: string
  description: string
  amount: number | string | null
  currency: string
  date: string
  paid_by: string
  created_by: string
  paidBy: { display_name: string } | { display_name: string }[] | null
  creator: { display_name: string } | { display_name: string }[] | null
  expense_splits: Array<{ user_id: string; amount: number | string | null }> | null
}

type SettlementRow = {
  payer_id: string
  payee_id: string
  amount: number | string | null
  note: string | null
  settled_at: string
}

function getProfile(
  profile: { display_name: string; avatar_url?: string | null } | { display_name: string; avatar_url?: string | null }[] | null
) {
  if (!profile) return null
  return Array.isArray(profile) ? profile[0] ?? null : profile
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

export default async function FriendDetailPage({ params }: FriendPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: friendship } = await supabase
    .from('friendships')
    .select(`
      id,
      user_a,
      user_b,
      friend_a:profiles!friendships_user_a_fkey(display_name, avatar_url),
      friend_b:profiles!friendships_user_b_fkey(display_name, avatar_url)
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!friendship) notFound()
  if (friendship.user_a !== user.id && friendship.user_b !== user.id) notFound()

  const friendProfile =
    friendship.user_a === user.id ? getProfile(friendship.friend_b) : getProfile(friendship.friend_a)
  const friendId = friendship.user_a === user.id ? friendship.user_b : friendship.user_a
  const friendName = friendProfile?.display_name ?? 'Friend'
  const avatarUrl = friendProfile?.avatar_url ?? null

  const { data: expenseRows } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      amount,
      currency,
      date,
      paid_by,
      created_by,
      paidBy:profiles!expenses_paid_by_fkey(display_name),
      creator:profiles!expenses_created_by_fkey(display_name),
      expense_splits(
        user_id,
        amount
      )
    `)
    .eq('friendship_id', friendship.id)
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: settlementRows } = await supabase
    .from('settlements')
    .select('payer_id, payee_id, amount, note, settled_at')
    .eq('friendship_id', friendship.id)

  const expenses = (expenseRows ?? []) as ExpenseRow[]
  const settlements = (settlementRows ?? []) as SettlementRow[]
  const balances = calculateMemberBalances(
    [
      { id: user.id, name: 'You' },
      { id: friendId, name: friendName },
    ],
    expenses,
    settlements
  )
  const yourBalance = balances.find((balance) => balance.memberId === user.id)?.balance ?? 0
  const simplifiedDebts = simplifyDebts(
    balances.map((balance) => ({
      memberId: balance.memberId,
      name: balance.memberId === user.id ? 'You' : friendName,
      balance: balance.balance,
    }))
  )
  const settlementCurrency = expenses[0]?.currency ?? 'INR'

  const modalTransactions = simplifiedDebts.map((transaction) => ({
    ...transaction,
    fromName: transaction.fromMemberId === user.id ? 'You' : friendName,
    toName: transaction.toMemberId === user.id ? 'You' : friendName,
  }))

  return (
    <div className="page-shell space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar alt={friendName} fallback={friendName} src={avatarUrl} size="lg" />
          <div>
            <Badge variant="primary">Friend</Badge>
            <h1 className="mt-3 font-display text-4xl leading-none text-foreground sm:text-5xl">{friendName}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-light sm:text-base">
              Shared expense history and one net balance with this friend.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="secondary">
            <Link href="/friends">Back to friends</Link>
          </Button>
          <Button asChild>
            <Link href={`/friends/${friendship.id}/expenses/new`}>Add expense</Link>
          </Button>
        </div>
      </section>

      <Card priority className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Net balance</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">
              {describeNetBalance(yourBalance, friendName)}
            </h2>
          </div>
          <p
            className={
              yourBalance > 0
                ? 'font-display text-4xl text-success'
                : yourBalance < 0
                  ? 'font-display text-4xl text-primary'
                  : 'font-display text-4xl text-foreground'
            }
          >
            {formatCurrency(Math.abs(yourBalance), settlementCurrency)}
          </p>
        </div>
        <p className="mt-3 text-sm text-muted-light">
          {Math.abs(yourBalance) < 0.01
            ? 'This friendship is fully settled right now.'
            : 'Opposite debts are already offset here, so this is the only amount that matters.'}
        </p>
        <div className="mt-6">
          <FriendshipSettleUpModal
            friendshipId={friendship.id}
            currency={settlementCurrency}
            currentUserId={user.id}
            transactions={modalTransactions}
          />
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">History</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Shared expenses</h2>
          </div>
          <Badge variant="primary">{expenses.length}</Badge>
        </div>

        {expenses.length > 0 ? (
          <div className="grid gap-4">
            {expenses.map((expense) => {
              const payer = getProfile(expense.paidBy)
              const creator = getProfile(expense.creator)
              const myShare = Number(expense.expense_splits?.find((split) => split.user_id === user.id)?.amount ?? 0)

              return (
                <Card key={expense.id} className="p-0">
                  <div className="flex min-h-16 items-center gap-4 px-4 py-4">
                    <div className="theme-chip grid h-9 w-9 shrink-0 place-items-center text-sm font-bold text-primary">
                      {expense.description.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-2xl text-foreground">{expense.description}</p>
                      <p className="truncate text-sm text-muted-light">
                        Paid by {payer?.display_name ?? 'Member'} | Added by {creator?.display_name ?? 'Member'} | {formatDate(expense.date)}
                      </p>
                    </div>
                    <div className="min-w-20 shrink-0 text-right">
                      <p className="font-display text-3xl text-primary">{formatCurrency(myShare, expense.currency)}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="p-5 sm:p-6">
            <p className="text-sm text-muted-light">No shared expenses yet.</p>
          </Card>
        )}
      </section>
    </div>
  )
}
