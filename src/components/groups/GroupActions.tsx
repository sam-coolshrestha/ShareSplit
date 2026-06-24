'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

type GroupActionsProps = {
  groupId: string
  currentUserId: string
  isAdmin: boolean
}

export function GroupActions({ groupId, currentUserId, isAdmin }: GroupActionsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const leaveGroup = async () => {
    setIsWorking(true)
    setError(null)

    const supabase = createClient()
    const { error: leaveError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)

    setIsWorking(false)

    if (leaveError) {
      setError(leaveError.message)
      return
    }

    router.push('/groups')
    router.refresh()
  }

  const deleteGroup = async () => {
    if (!window.confirm('Delete this group? This will remove members, expenses, and settlements.')) {
      return
    }

    setIsWorking(true)
    setError(null)

    const supabase = createClient()
    const { error: deleteError } = await supabase.from('groups').delete().eq('id', groupId)

    setIsWorking(false)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    router.push('/groups')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {isAdmin ? (
        <Button variant="danger" className="w-full sm:w-auto" disabled={isWorking} onClick={deleteGroup}>
          {isWorking ? 'Deleting group' : 'Delete group'}
        </Button>
      ) : (
        <Button variant="secondary" className="w-full sm:w-auto" disabled={isWorking} onClick={leaveGroup}>
          {isWorking ? 'Leaving group' : 'Leave group'}
        </Button>
      )}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  )
}
