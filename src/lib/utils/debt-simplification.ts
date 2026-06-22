export type DebtBalance = {
  memberId: string
  name?: string
  balance: number
}

export type SimplifiedDebt = {
  fromMemberId: string
  fromName?: string
  toMemberId: string
  toName?: string
  amount: number
}

function toCents(amount: number) {
  return Math.round(amount * 100)
}

function fromCents(cents: number) {
  return Math.round(cents) / 100
}

export function simplifyDebts(balances: DebtBalance[]): SimplifiedDebt[] {
  const debtors = balances
    .map((balance) => ({ ...balance, cents: toCents(balance.balance) }))
    .filter((balance) => balance.cents < 0)
    .sort((a, b) => a.cents - b.cents)

  const creditors = balances
    .map((balance) => ({ ...balance, cents: toCents(balance.balance) }))
    .filter((balance) => balance.cents > 0)
    .sort((a, b) => b.cents - a.cents)

  const settlements: SimplifiedDebt[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const cents = Math.min(Math.abs(debtor.cents), creditor.cents)

    if (cents > 0) {
      settlements.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amount: fromCents(cents),
      })
    }

    debtor.cents += cents
    creditor.cents -= cents

    if (debtor.cents === 0) debtorIndex += 1
    if (creditor.cents === 0) creditorIndex += 1
  }

  return settlements
}
