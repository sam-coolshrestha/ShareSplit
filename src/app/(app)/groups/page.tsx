import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

type Group = {
  id: string
  name: string
  description: string | null
  currency: string
  created_at: string
  group_members?: Array<{ count: number }>
}

export default async function GroupsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name, description, currency, created_at, group_members(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 md:space-y-9">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">Groups</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">
            Shared circles
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            Keep trips, homes, dinners, and projects in their own lanes.
          </p>
        </div>

        <Link href="/groups/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <PlusIcon className="h-4 w-4" />
            New group
          </Button>
        </Link>
      </section>

      {error ? (
        <Card className="border-error bg-surface-raised p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-error">
            Could not load groups
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-light">{error.message}</p>
        </Card>
      ) : null}

      {!error && groups?.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(groups as Group[]).map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="group block">
              <Card className="halftone relative flex min-h-56 flex-col overflow-hidden p-5 transition group-hover:-translate-y-0.5 group-hover:bg-surface-raised">
                <div className="relative z-10 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="theme-chip grid h-12 w-12 shrink-0 place-items-center bg-primary text-ink">
                      <GroupsIcon className="h-6 w-6" />
                    </div>
                    <span className="theme-chip px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-muted-light">
                      {group.currency}
                    </span>
                  </div>

                  <div className="mt-6 flex-1">
                    <h2 className="font-display text-3xl leading-none text-foreground">
                      {group.name}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-light">
                      {group.description || 'No description yet. Add expenses and members when you are ready.'}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4 border-t-[length:var(--border-width)] border-border pt-4">
                    <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                      {getMemberCount(group)} member{getMemberCount(group) === 1 ? '' : 's'}
                    </p>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                      Open
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}

      {!error && !groups?.length ? (
        <Card priority className="comic-halftone relative overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center">
            <div className="theme-chip grid h-20 w-20 place-items-center bg-surface-raised text-primary">
              <GroupsIcon className="h-10 w-10" />
            </div>
            <h2 className="mt-7 font-display text-3xl text-foreground">No groups yet</h2>
            <p className="mt-3 text-sm leading-6 text-muted-light sm:text-base">
              Start with one shared space for rent, travel, dinner, or anything people split together.
            </p>
            <Link href="/groups/new" className="mt-7">
              <Button>
                <PlusIcon className="h-4 w-4" />
                Create your first group
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function getMemberCount(group: Group) {
  return group.group_members?.[0]?.count ?? 0
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

function GroupsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M15 15c3 0 5 1.5 5 5" />
    </svg>
  )
}
