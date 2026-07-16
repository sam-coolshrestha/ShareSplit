'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

type Friend = {
  friendshipId: string
  display_name: string
}
type Group = {
  id: string
  name: string
}

type FriendshipRow = {
  id: string
  user_a: string
  user_b: string
  friend_a: { display_name: string } | { display_name: string }[] | null
  friend_b: { display_name: string } | { display_name: string }[] | null
}

type GroupMembershipRow = {
  group_id: string
  group: { name: string } | { name: string }[] | null
}

function getDisplayName(
  profile: { display_name: string } | { display_name: string }[] | null
) {
  if (!profile) return 'Friend'
  return Array.isArray(profile) ? profile[0]?.display_name ?? 'Friend' : profile.display_name
}

export function AddExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()

  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'friend' | 'group' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    const fetchData = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        setIsLoading(false)
        return
      }

      // Fetch friendships
      const { data: friendRows } = await supabase
        .from('friendships')
        .select('id, user_a, user_b, friend_a:profiles!friendships_user_a_fkey(display_name), friend_b:profiles!friendships_user_b_fkey(display_name)')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

      const friendList: Friend[] = ((friendRows ?? []) as FriendshipRow[]).map((row) => {
        const friendProfile = row.user_a === user.id ? row.friend_b : row.friend_a
        return { friendshipId: row.id, display_name: getDisplayName(friendProfile) }
      })

      // Fetch groups
      const { data: groupRows } = await supabase
        .from('group_members')
        .select('group_id, group:groups!group_members_group_id_fkey(name)')
        .eq('user_id', user.id)

      const groupList: Group[] = ((groupRows ?? []) as GroupMembershipRow[]).map((row) => ({
        id: row.group_id,
        name: Array.isArray(row.group) ? row.group[0]?.name ?? '' : row.group?.name ?? '',
      }))

      setFriends(friendList)
      setGroups(groupList)
      setIsLoading(false)
    }

    fetchData()
  }, [open, router, supabase])

  const filteredFriends = friends.filter((f) =>
    f.display_name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-md border border-muted">
        <div className="flex justify-between items-center p-4 border-b border-muted">
          <h3 className="text-lg font-medium">Add Expense</h3>
          <button className="text-muted-light hover:text-foreground" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex border-b border-muted">
          <Button
            variant={mode === 'friend' ? 'primary' : 'ghost'}
            className="flex-1 justify-center"
            onClick={() => setMode('friend')}
          >
            Split with a Friend
          </Button>
          <Button
            variant={mode === 'group' ? 'primary' : 'ghost'}
            className="flex-1 justify-center"
            onClick={() => setMode('group')}
          >
            Add to Existing Group
          </Button>
        </div>

        {mode && (
          <div className="p-4 border-b border-muted">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-muted bg-surface p-2 text-foreground placeholder:text-muted-light"
            />
          </div>
        )}

        <ul className="divide-y divide-muted max-h-[50vh] overflow-y-auto">
          {isLoading && <li className="p-4 text-center text-muted-light">Loading...</li>}

          {!isLoading && mode === 'friend' && filteredFriends.length === 0 && (
            <li className="p-4 text-center text-muted-light">No friends found.</li>
          )}

          {!isLoading &&
            mode === 'friend' &&
            filteredFriends.map((friend) => (
              <li
                key={friend.friendshipId}
                className="flex items-center p-4 min-h-[56px] cursor-pointer hover:bg-surface-raised"
                onClick={() => {
                  onClose()
                  router.push(`/friends/${friend.friendshipId}/expenses/new`)
                }}
              >
                <span className="flex-1">{friend.display_name}</span>
              </li>
            ))}

          {!isLoading && mode === 'group' && filteredGroups.length === 0 && (
            <li className="p-4 text-center text-muted-light">No groups found.</li>
          )}

          {!isLoading &&
            mode === 'group' &&
            filteredGroups.map((group) => (
              <li
                key={group.id}
                className="flex items-center p-4 min-h-[56px] cursor-pointer hover:bg-surface-raised"
                onClick={() => {
                  onClose()
                  router.push(`/groups/${group.id}/expenses/new`)
                }}
              >
                <span className="flex-1">{group.name}</span>
              </li>
            ))}

          <li
            className="flex items-center p-4 min-h-[56px] cursor-pointer hover:bg-surface-raised"
            onClick={() => {
              onClose()
              router.push('/groups/new')
            }}
          >
            <span className="flex-1">Create New Group</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
