import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

type GroupDetailPageProps = {
  params: {
    id: string
  }
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">{group.currency}</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">
            {group.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            {group.description || 'This group is ready for members, expenses, and settlements.'}
          </p>
        </div>

        <Link href="/groups">
          <Button variant="secondary">
            <ArrowLeftIcon className="h-4 w-4" />
            Groups
          </Button>
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            Members
          </p>
          <p className="mt-3 font-display text-4xl text-primary">{memberCount}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            Expenses
          </p>
          <p className="mt-3 font-display text-4xl text-primary">0</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            Balance
          </p>
          <p className="mt-3 font-display text-4xl text-primary">0</p>
        </Card>
      </div>

      <Card priority className="comic-halftone relative overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="relative z-10 mx-auto max-w-lg">
          <h2 className="font-display text-3xl text-foreground">Group created</h2>
          <p className="mt-3 text-sm leading-6 text-muted-light sm:text-base">
            Expenses, member invites, and settlement tools can build on this page next.
          </p>
        </div>
      </Card>
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
