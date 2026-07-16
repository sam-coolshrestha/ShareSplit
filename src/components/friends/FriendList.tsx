'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'

type FriendEntry = {
  friendshipId: string
  friendId: string
  friendName: string
  avatarUrl: string | null
  balance: number
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function FriendList({ friends }: { friends: FriendEntry[] }) {
  const router = useRouter()

  return (
    <div className="grid gap-4">
      {friends
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
        .map((friend) => (
          <FriendRow key={friend.friendId} friend={friend} router={router} />
        ))}
    </div>
  )
}

function FriendRow({
  friend,
  router,
}: {
  friend: FriendEntry
  router: ReturnType<typeof useRouter>
}) {
  return (
    <Card className="p-0 overflow-hidden">
      {/* Feature 5: Full-row tappable button */}
      <button
        type="button"
        onClick={() => router.push(`/friends/${friend.friendshipId}`)}
        className="w-full text-left touch-manipulation"
        style={{ touchAction: 'manipulation', minHeight: 64 }}
      >
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
          {/* Left: avatar + name/balance text */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar
              alt={friend.friendName}
              fallback={friend.friendName}
              src={friend.avatarUrl}
              size="sm"
            />
            <div className="min-w-0">
              <p className="font-display text-2xl text-foreground leading-tight">{friend.friendName}</p>
              <p className="mt-0.5 text-sm text-muted-light truncate">
                {friend.balance > 0
                  ? `Owes you ${formatCurrency(friend.balance, 'INR')}`
                  : friend.balance < 0
                  ? `You owe ${friend.friendName} ${formatCurrency(Math.abs(friend.balance), 'INR')}`
                  : 'Settled up'}
              </p>
            </div>
          </div>

          {/* Feature 1: Action buttons + balance */}
          <div className="flex items-center gap-2 shrink-0">
            {/* + Expense button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/friends/${friend.friendshipId}/expenses/new`)
              }}
              title="Add expense"
              aria-label={`Add expense with ${friend.friendName}`}
              className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-control)] border-[length:var(--border-width)] border-border bg-surface-raised px-2 text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-surface-high transition-colors"
              style={{ touchAction: 'manipulation', minHeight: 44, minWidth: 44 }}
            >
              <span aria-hidden>＋</span>
              <span className="hidden sm:inline">Expense</span>
            </button>

            {/* + Group button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                router.push(
                  `/groups/new?friendId=${friend.friendId}`
                )
              }}
              title="Add to group"
              aria-label={`Add ${friend.friendName} to a group`}
              className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-control)] border-[length:var(--border-width)] border-border bg-surface-raised px-2 text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-surface-high transition-colors"
              style={{ touchAction: 'manipulation', minHeight: 44, minWidth: 44 }}
            >
              <span aria-hidden>＋</span>
              <span className="hidden sm:inline">Group</span>
            </button>

            {/* Balance amount */}
            <p
              className={
                friend.balance > 0
                  ? 'font-display text-2xl text-success min-w-[4rem] text-right'
                  : 'font-display text-2xl text-primary min-w-[4rem] text-right'
              }
            >
              {formatCurrency(Math.abs(friend.balance), 'INR')}
            </p>
          </div>
        </div>
      </button>
    </Card>
  )
}
