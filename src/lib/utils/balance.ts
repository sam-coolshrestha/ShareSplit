export type BalanceMember = {
  id: string
  name: string
}

export type BalanceSplit = {
  user_id: string
  amount: number | string | null
}

export type BalanceExpense = {
  amount: number | string | null
  paid_by: string
  expense_splits: BalanceSplit[] | null
}

export type BalanceSettlement = {
  payer_id: string
  payee_id: string
  amount: number | string | null
}

export type MemberBalance = {
  memberId: string
  name: string
  balance: number
}

function toMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

export function calculateMemberBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = []
): MemberBalance[] {
  const memberNames = new Map(members.map((member) => [member.id, member.name]))
  const balances = new Map(members.map((member) => [member.id, 0]))

  for (const expense of expenses) {
    const expenseAmount = toMoney(expense.amount)
    balances.set(expense.paid_by, (balances.get(expense.paid_by) ?? 0) + expenseAmount)

    for (const split of expense.expense_splits ?? []) {
      const shareAmount = toMoney(split.amount)
      balances.set(split.user_id, (balances.get(split.user_id) ?? 0) - shareAmount)
    }
  }

  for (const settlement of settlements) {
    const settlementAmount = toMoney(settlement.amount)
    balances.set(settlement.payer_id, (balances.get(settlement.payer_id) ?? 0) + settlementAmount)
    balances.set(settlement.payee_id, (balances.get(settlement.payee_id) ?? 0) - settlementAmount)
  }

  return Array.from(balances.entries())
    .map(([memberId, balance]) => ({
      memberId,
      name: memberNames.get(memberId) ?? 'Member',
      balance: toMoney(balance),
    }))
    .sort((a, b) => {
      if (Math.abs(b.balance) !== Math.abs(a.balance)) return Math.abs(b.balance) - Math.abs(a.balance)
      return a.name.localeCompare(b.name)
    })
}
