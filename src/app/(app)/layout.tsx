import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export default async function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <AppShell
      user={{
        displayName:
          profile?.display_name ??
          user.user_metadata.full_name ??
          user.email?.split('@')[0] ??
          'ShareSplit user',
        email: user.email ?? '',
        avatarUrl: profile?.avatar_url ?? user.user_metadata.avatar_url ?? null,
      }}
    >
      {children}
    </AppShell>
  )
}
