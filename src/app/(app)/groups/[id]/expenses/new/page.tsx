import { notFound, redirect } from 'next/navigation'

import { EqualExpenseForm } from '@/components/groups/EqualExpenseForm'
import { createClient } from '@/lib/supabase/server'

type NewExpensePageProps = {
  params: {
    id: string
  }
}

type MemberRow = {
  user_id: string
  profiles:
    | {
        display_name: string
      }
    | {
        display_name: string
      }[]
    | null
}

function getDisplayName(profile: MemberRow['profiles']) {
  if (!profile) return 'Member'
  return Array.isArray(profile) ? profile[0]?.display_name ?? 'Member' : profile.display_name
}

export default async function NewExpensePage({ params }: NewExpensePageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, currency')
    .eq('id', params.id)
    .maybeSingle()

  if (!group) notFound()

  const { data: membership } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/groups')

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name)')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true })

  const normalizedMembers =
    (members as MemberRow[] | null)?.map((member) => ({
      id: member.user_id,
      name: getDisplayName(member.profiles),
    })) ?? []

  if (!normalizedMembers.length) redirect(`/groups/${group.id}`)

  return (
    <EqualExpenseForm
      currency={group.currency}
      groupId={group.id}
      groupName={group.name}
      members={normalizedMembers}
    />
  )
}
