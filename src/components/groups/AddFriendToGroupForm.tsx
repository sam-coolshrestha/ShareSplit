'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

type FriendOption = {
  id: string
  name: string
}

export function AddFriendToGroupForm({
  friends,
  groupId,
}: {
  friends: FriendOption[]
  groupId: string
}) {
  const router = useRouter()
  const [selectedFriendId, setSelectedFriendId] = useState(friends[0]?.id ?? '')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async () => {
    if (!selectedFriendId) return

    setIsSubmitting(true)
    setMessage(null)

    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage({ type: 'error', text: 'You need to sign in again.' })
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.from('group_invites').insert({
      group_id: groupId,
      invited_by: user.id,
      invited_user_id: selectedFriendId,
      status: 'pending',
    })

    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setMessage({ type: 'success', text: 'Friend invite sent.' })
    router.refresh()
  }

  if (!friends.length) {
    return <p className="text-sm text-muted-light">All your friends are already in this group.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="friendToAdd"
          className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground"
        >
          Add existing friend
        </label>
        <select
          id="friendToAdd"
          className="theme-input h-11 w-full px-3 text-sm"
          value={selectedFriendId}
          onChange={(event) => setSelectedFriendId(event.target.value)}
        >
          {friends.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.name}
            </option>
          ))}
        </select>
      </div>
      {message ? (
        <p className={message.type === 'error' ? 'text-sm text-error' : 'text-sm text-success'}>
          {message.text}
        </p>
      ) : null}
      <Button type="button" onClick={onSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Sending' : 'Invite friend'}
      </Button>
    </div>
  )
}
