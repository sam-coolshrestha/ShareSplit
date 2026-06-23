import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AddFriendForm } from '@/components/friends/AddFriendForm'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'
import { calculateFriendBalances, type FriendExpense, type FriendSettlement } from '@/lib/utils/friend-balances'

type FriendshipRow = {
  id: string
  user_a: string
  user_b: string
  friend_a: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null
  friend_b: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null
}

function getProfile(
  profile: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null
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

export default async function FriendsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: friendshipRows } = await supabase
    .from('friendships')
    .select(`
      id,
      user_a,
      user_b,
      friend_a:profiles!friendships_user_a_fkey(display_name, avatar_url),
      friend_b:profiles!friendships_user_b_fkey(display_name, avatar_url)
    `)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const friendships = ((friendshipRows ?? []) as FriendshipRow[])

  const balances = await Promise.all(
    friendships.map(async (friendship) => {
      const friendProfile =
        friendship.user_a === user.id ? getProfile(friendship.friend_b) : getProfile(friendship.friend_a)
      const friendId = friendship.user_a === user.id ? friendship.user_b : friendship.user_a

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
          expense_splits(
            user_id,
            amount
          )
        `)
        .eq('friendship_id', friendship.id)
        .eq('is_deleted', false)

      const { data: settlementRows } = await supabase
        .from('settlements')
        .select('payer_id, payee_id, amount, note, settled_at')
        .eq('friendship_id', friendship.id)

      const balance = calculateFriendBalances(
        user.id,
        friendId,
        friendProfile?.display_name ?? 'Friend',
        (expenseRows ?? []) as FriendExpense[],
        (settlementRows ?? []) as FriendSettlement[]
      )

      return {
        friendshipId: friendship.id,
        friendId,
        friendName: friendProfile?.display_name ?? 'Friend',
        avatarUrl: friendProfile?.avatar_url ?? null,
        balance: balance.balance,
      }
    })
  )

  return (
    <div className="page-shell space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">Friends</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">
            One-to-one balances
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            See what each friend owes you or what you owe them across all shared expenses.
          </p>
        </div>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="mb-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Add friend</p>
          <h2 className="mt-2 font-display text-3xl text-foreground">Bring someone in by email</h2>
          <p className="mt-2 text-sm leading-6 text-muted-light">
            Once they already have a ShareSplit account, this creates the friendship immediately.
          </p>
        </div>
        <AddFriendForm />
      </Card>

      {balances.length > 0 ? (
        <div className="grid gap-4">
          {balances
            .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
            .map((friend) => (
              <Link key={friend.friendId} href={`/friends/${friend.friendId}`} className="block">
                <Card className="p-0">
                  <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        alt={friend.friendName}
                        fallback={friend.friendName}
                        src={friend.avatarUrl}
                        size="sm"
                      />
                      <div>
                        <p className="font-display text-2xl text-foreground">{friend.friendName}</p>
                        <p className="mt-1 text-sm text-muted-light">
                          {friend.balance > 0
                            ? `Owes you ${formatCurrency(friend.balance, 'INR')}`
                            : `You owe ${friend.friendName} ${formatCurrency(Math.abs(friend.balance), 'INR')}`}
                        </p>
                      </div>
                    </div>
                    <p className={friend.balance > 0 ? 'font-display text-3xl text-success' : 'font-display text-3xl text-primary'}>
                      {formatCurrency(Math.abs(friend.balance), 'INR')}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
        </div>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="text-sm text-muted-light">No friendships yet.</p>
        </Card>
      )}

    </div>
  )
}
