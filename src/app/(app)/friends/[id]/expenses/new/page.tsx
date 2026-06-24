import { notFound, redirect } from 'next/navigation'

import { FriendExpenseForm } from '@/components/friends/FriendExpenseForm'
import { createClient } from '@/lib/supabase/server'

type FriendExpensePageProps = {
  params: {
    id: string
  }
}

type FriendshipRow = {
  id: string
  user_a: string
  user_b: string
  friend_a: { display_name: string } | { display_name: string }[] | null
  friend_b: { display_name: string } | { display_name: string }[] | null
}

function getDisplayName(profile: FriendshipRow['friend_a']) {
  if (!profile) return 'Friend'
  return Array.isArray(profile) ? profile[0]?.display_name ?? 'Friend' : profile.display_name
}

export default async function NewFriendExpensePage({ params }: FriendExpensePageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: friendship } = await supabase
    .from('friendships')
    .select(`
      id,
      user_a,
      user_b,
      friend_a:profiles!friendships_user_a_fkey(display_name),
      friend_b:profiles!friendships_user_b_fkey(display_name)
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!friendship) notFound()
  if (friendship.user_a !== user.id && friendship.user_b !== user.id) notFound()

  const friendId = friendship.user_a === user.id ? friendship.user_b : friendship.user_a
  const friendName = friendship.user_a === user.id ? getDisplayName(friendship.friend_b) : getDisplayName(friendship.friend_a)

  return (
    <FriendExpenseForm
      currency="INR"
      friendshipId={friendship.id}
      friendName={friendName}
      members={[
        { id: user.id, name: 'You' },
        { id: friendId, name: friendName },
      ]}
    />
  )
}
