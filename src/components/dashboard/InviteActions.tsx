'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export function InviteActions({ inviteId }: { inviteId: string }) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const respond = async (action: 'accept' | 'decline') => {
    setPendingAction(action)
    setError(null)

    const supabase = createClient()
    const { error: responseError } = await supabase.rpc(
      action === 'accept' ? 'accept_group_invite' : 'decline_group_invite',
      { target_invite_id: inviteId }
    )

    if (responseError) {
      setError(responseError.message)
      setPendingAction(null)
      return
    }

    router.refresh()
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          onClick={() => respond('accept')}
          disabled={pendingAction !== null}
          className="w-full sm:w-auto"
        >
          {pendingAction === 'accept' ? 'Accepting' : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => respond('decline')}
          disabled={pendingAction !== null}
          className="w-full sm:w-auto"
        >
          {pendingAction === 'decline' ? 'Declining' : 'Decline'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
    </div>
  )
}
