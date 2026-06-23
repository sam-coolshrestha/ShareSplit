import type { BalanceExpense, BalanceMember, BalanceSettlement, MemberBalance } from './balance'
import { calculateMemberBalances } from './balance'

export type FriendBalance = {
  friendshipId: string
  friendId: string
  friendName: string
  balance: number
}

export type FriendExpense = BalanceExpense & {
  id: string
  description: string
  currency: string
  date: string
  paid_by: string
  created_by: string
  paidBy?: { display_name: string } | { display_name: string }[] | null
  creator?: { display_name: string } | { display_name: string }[] | null
  expense_splits?: Array<{
    user_id: string
    amount: number | string | null
  }> | null
}

export type FriendSettlement = BalanceSettlement & {
  note: string | null
  settled_at: string
}

export function calculateFriendBalances(
  currentUserId: string,
  friendId: string,
  friendName: string,
  expenses: FriendExpense[],
  settlements: FriendSettlement[] = []
): FriendBalance {
  const balances = calculateMemberBalances(
    [
      { id: currentUserId, name: 'You' },
      { id: friendId, name: friendName },
    ] satisfies BalanceMember[],
    expenses,
    settlements
  )

  const youBalance = balances.find((balance) => balance.memberId === currentUserId)
  const friendBalance = balances.find((balance) => balance.memberId === friendId)
  const balance = friendBalance?.balance ?? -(youBalance?.balance ?? 0)

  return {
    friendshipId: `${currentUserId}-${friendId}`,
    friendId,
    friendName,
    balance,
  }
}

