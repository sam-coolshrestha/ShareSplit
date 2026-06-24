'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AddExpenseModal } from './AddExpenseModal'
import { InviteActions } from './InviteActions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type ExpenseShareRow = {
  expense_id: string
  amount: number | string | null
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

type DashboardProps = {
  displayName: string
  totalBalance: number
  recentExpenses: RecentExpenseRow[]
  invites: Array<{
    id: string
    created_at: string
    group: { name: string } | { name: string }[] | null
    inviter: { display_name: string } | { display_name: string }[] | null
  }>
}

export function Dashboard({ displayName, totalBalance, recentExpenses, invites }: DashboardProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">Dashboard</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">
            Hello, {displayName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-light sm:text-base">
            Here is the latest on your shared expenses and balances.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <PlusIcon className="h-4 w-4" />
          Add expense
        </Button>
      </section>

      <Card priority className="halftone relative overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="relative z-10 flex min-h-52 flex-col justify-between gap-10 sm:min-h-64 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted-light">
              Total balance
            </p>
            <p className="mt-5 font-display text-6xl leading-none text-primary sm:text-7xl lg:text-8xl">
              {formatCurrency(totalBalance, 'INR')}
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-light">
              {totalBalance > 0
                ? 'Your equal shares are now being tracked from the expenses you are part of.'
                : 'You are all settled up. New expenses and repayments will update this balance.'}
            </p>
          </div>

          <div className="theme-chip flex w-fit items-center gap-3 px-4 py-3">
            <BalanceIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">
                Status
              </p>
              <p className="text-sm font-bold text-foreground">{totalBalance > 0 ? 'Owes share' : 'Balanced'}</p>
            </div>
          </div>
        </div>
      </Card>

      {invites?.length ? (
        <section>
          <div className="mb-5 flex items-center gap-3">
            <Badge variant="error">{invites.length}</Badge>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Notifications
              </p>
              <h2 className="mt-1 font-display text-3xl text-foreground">Group invites</h2>
            </div>
          </div>

          <div className="grid gap-4">
            {invites.map((invite) => {
              const group = Array.isArray(invite.group) ? invite.group[0] : invite.group
              const inviter = Array.isArray(invite.inviter) ? invite.inviter[0] : invite.inviter

              return (
                <Card key={invite.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-display text-2xl text-foreground">
                        {group?.name ?? 'Group invitation'}
                      </p>
                      <p className="mt-2 text-sm text-muted-light">
                        Invited by {inviter?.display_name ?? 'a group admin'}
                      </p>
                    </div>
                    <InviteActions inviteId={invite.id} />
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Recent activity
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Expenses</h2>
          </div>
          <a
            href="/activity"
            className="font-mono text-xs font-bold uppercase tracking-wider text-muted-light hover:text-primary"
          >
            View activity
          </a>
        </div>

        {recentExpenses.length > 0 ? (
          <div className="grid gap-4">
            {recentExpenses.map((expense) => (
              <Card key={expense.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-2xl text-foreground">{expense.description}</p>
                    <p className="mt-2 text-sm text-muted-light">
                      {expense.groupName} • Paid by {expense.payerName} • {formatDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
                      Your share
                    </p>
                    <p className="mt-2 font-display text-3xl text-primary">
                      {formatCurrency(Number(expense.amount ?? 0), expense.currency)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="relative overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-16">
            <div className="comic-halftone pointer-events-none absolute inset-0 opacity-20" />
            <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center">
              <div className="theme-chip grid h-20 w-20 place-items-center bg-surface-raised text-primary">
                <ReceiptIcon className="h-9 w-9" />
              </div>
              <h3 className="mt-7 font-display text-3xl text-foreground">No expenses yet</h3>
              <p className="mt-3 text-sm leading-6 text-muted-light sm:text-base">
                Your recent shared expenses will appear here after you add your first one.
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="mt-7">
                <PlusIcon className="h-4 w-4" />
                Add your first expense
              </Button>
            </div>
          </Card>
        )}
      </section>

      <AddExpenseModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
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

type IconProps = {
  className?: string
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function BalanceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 7h16v12H4zM4 10h16M8 15h3" />
    </svg>
  )
}

function ReceiptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4" />
    </svg>
  )
}