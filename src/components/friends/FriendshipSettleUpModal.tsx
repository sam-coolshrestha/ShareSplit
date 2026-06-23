'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import type { SimplifiedDebt } from '@/lib/utils/debt-simplification'
import { buildUpiDeepLink, isValidUpiId, normalizeUpiId, upiApps, type UpiApp } from '@/lib/utils/upi'

type ActiveTransaction = SimplifiedDebt & {
  key: string
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function transactionKey(transaction: SimplifiedDebt) {
  return `${transaction.fromMemberId}-${transaction.toMemberId}-${transaction.amount.toFixed(2)}`
}

export function FriendshipSettleUpModal({
  friendshipId,
  currency,
  currentUserId,
  transactions,
}: {
  friendshipId: string
  currency: string
  currentUserId: string
  transactions: SimplifiedDebt[]
}) {
  const router = useRouter()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [payeeUpiByKey, setPayeeUpiByKey] = useState<Record<string, string>>({})
  const [openedAppByKey, setOpenedAppByKey] = useState<Record<string, UpiApp | null>>({})
  const [statusByKey, setStatusByKey] = useState<Record<string, string | null>>({})
  const [isSaving, setIsSaving] = useState(false)

  const keyedTransactions = useMemo(
    () => transactions.map((transaction) => ({ ...transaction, key: transactionKey(transaction) })),
    [transactions]
  )
  const activeTransaction = keyedTransactions.find((transaction) => transaction.key === activeKey) ?? null

  const setStatus = (key: string, status: string | null) => {
    setStatusByKey((current) => ({ ...current, [key]: status }))
  }

  const payeeUpiId = activeTransaction ? payeeUpiByKey[activeTransaction.key] ?? '' : ''
  const canOpenUpi = isValidUpiId(payeeUpiId)

  const getDeepLink = (transaction: ActiveTransaction, app: UpiApp) =>
    buildUpiDeepLink({
      app,
      payeeUpiId,
      payeeName: transaction.toName ?? 'ShareSplit friend',
      amount: transaction.amount,
      currency,
      note: `ShareSplit settlement for ${transaction.toName ?? 'friend'}`,
    })

  const confirmSettlement = async () => {
    if (!activeTransaction) return

    const normalizedUpiId = normalizeUpiId(payeeUpiId)
    if (!isValidUpiId(normalizedUpiId)) {
      setStatus(activeTransaction.key, 'Enter a valid UPI ID before confirming.')
      return
    }

    setIsSaving(true)
    setStatus(activeTransaction.key, null)

    const supabase = createClient()
    const { error } = await supabase.from('settlements').insert({
      payer_id: activeTransaction.fromMemberId,
      payee_id: activeTransaction.toMemberId,
      amount: activeTransaction.amount,
      currency,
      group_id: null,
      friendship_id: friendshipId,
      note: `Paid via ${openedAppByKey[activeTransaction.key] ?? 'UPI'} to ${normalizedUpiId}`,
      created_by: currentUserId,
    })

    setIsSaving(false)

    if (error) {
      setStatus(activeTransaction.key, error.message)
      return
    }

    setStatus(activeTransaction.key, 'Settlement recorded.')
    setActiveKey(null)
    router.refresh()
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="space-y-3">
          {keyedTransactions.length > 0 ? (
            keyedTransactions.map((transaction) => (
              <div key={transaction.key} className="theme-card flex flex-col gap-4 bg-surface-raised px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-light">
                    <span className="font-bold text-foreground">{transaction.fromName ?? 'Member'}</span> pays{' '}
                    <span className="font-bold text-foreground">{transaction.toName ?? 'Member'}</span>
                  </p>
                  <p className="mt-2 font-display text-3xl text-primary">{formatCurrency(transaction.amount, currency)}</p>
                  {statusByKey[transaction.key] ? <p className="mt-2 text-xs text-muted-light">{statusByKey[transaction.key]}</p> : null}
                </div>
                <Button type="button" onClick={() => setActiveKey(transaction.key)}>
                  Settle up
                </Button>
              </div>
            ))
          ) : (
            <div className="theme-card bg-surface-raised px-4 py-6 text-sm text-muted-light">
              No settlement transfers are needed.
            </div>
          )}
        </div>
      </Card>

      {activeTransaction ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/70 p-4 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="friend-settle-up-title"
        >
          <div className="theme-card-priority max-h-[90dvh] w-full max-w-lg overflow-y-auto bg-surface p-5 pb-safe sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="primary">UPI</Badge>
                <h3 id="friend-settle-up-title" className="mt-4 font-display text-3xl text-foreground">
                  Settle up with a friend
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-light">
                  {activeTransaction.fromName ?? 'Member'} pays {activeTransaction.toName ?? 'Member'} {formatCurrency(activeTransaction.amount, currency)}.
                </p>
              </div>
              <button
                type="button"
                className="theme-chip px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground"
                onClick={() => setActiveKey(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <label htmlFor="friendPayeeUpiId" className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Payee UPI ID
              </label>
              <input
                id="friendPayeeUpiId"
                className="theme-input h-11 w-full px-3 text-sm"
                placeholder="name@bank"
                value={payeeUpiId}
                onChange={(event) => {
                  setPayeeUpiByKey((current) => ({
                    ...current,
                    [activeTransaction.key]: event.target.value,
                  }))
                  setStatus(activeTransaction.key, null)
                }}
              />
              {!canOpenUpi && payeeUpiId ? <p className="mt-2 text-xs text-error">Enter a valid UPI ID.</p> : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {upiApps.map((app) => (
                <Button
                  key={app.id}
                  asChild
                  variant="secondary"
                  className={!canOpenUpi ? 'pointer-events-none opacity-50' : undefined}
                  onClick={() => {
                    setOpenedAppByKey((current) => ({ ...current, [activeTransaction.key]: app.id }))
                    setStatus(activeTransaction.key, null)
                  }}
                >
                  <a href={canOpenUpi ? getDeepLink(activeTransaction, app.id) : '#'}>{app.label}</a>
                </Button>
              ))}
            </div>

            <div className="mt-5 theme-card bg-surface-raised px-4 py-3">
              <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Payee</p>
              <p className="mt-1 text-sm font-bold text-foreground">{activeTransaction.toName ?? 'Member'}</p>
              <p className="mt-3 font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Amount</p>
              <p className="mt-1 font-display text-3xl text-primary">{formatCurrency(activeTransaction.amount, currency)}</p>
            </div>

            {statusByKey[activeTransaction.key] ? <p className="mt-4 text-sm text-error">{statusByKey[activeTransaction.key]}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setActiveKey(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={isSaving || !canOpenUpi} onClick={confirmSettlement}>
                {isSaving ? 'Recording' : 'Confirm paid'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
