import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

import { GroupForm } from './group-form'

export default async function NewGroupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7">
      <section>
        <Badge variant="primary">New group</Badge>
        <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">
          Make a shared space
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
          Name the group, choose the default currency, and invite the rest later.
        </p>
      </section>

      <Card priority className="p-5 sm:p-7">
        <GroupForm />
      </Card>
    </div>
  )
}
