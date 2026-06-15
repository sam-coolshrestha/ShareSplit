import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

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

        <Button className="w-full sm:w-auto" disabled>
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
              ₹0
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-light">
              You are all settled up. New expenses and repayments will update this balance.
            </p>
          </div>

          <div className="theme-chip flex w-fit items-center gap-3 px-4 py-3">
            <BalanceIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">
                Status
              </p>
              <p className="text-sm font-bold text-foreground">Balanced</p>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Recent activity
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Expenses</h2>
          </div>
          <Link href="/activity" className="font-mono text-xs font-bold uppercase tracking-wider text-muted-light hover:text-primary">
            View activity
          </Link>
        </div>

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
            <Button className="mt-7" disabled>
              <PlusIcon className="h-4 w-4" />
              Add your first expense
            </Button>
          </div>
        </Card>
      </section>
    </div>
  )
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
