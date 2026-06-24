/* src/app/(app)/expenses/new/page.tsx */
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { SplitTabs } from '@/components/expenses/SplitTabs'

/**
 * New expense page.
 *
 * Supports three entry points via URL query parameters:
 *   • ?friendId=…&friendName=… – split with a single friend
 *   • ?groupId=…&groupName=…   – split within an existing group
 *   • no params                – user chooses friend or group (toggle UI not implemented)
 *
 * The page reads the params, sets a context label, loads the appropriate members,
 * and displays the EQUAL / CUSTOM / ITEMIZED split tabs.
 */

type Member = {
  id: string
  name: string
}

type Friend = {
  id: string
  display_name: string
}

type Group = {
  id: string
  name: string
}

/* -------------------------------------------------------------------------- */
/* Form schema – same as the friend expense form (extend as needed)           */
/* -------------------------------------------------------------------------- */
const expenseSchema = z.object({
  title: z.string().trim().min(2, 'Use at least 2 characters.').max(120, 'Keep it under 120 characters.'),
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount greater than zero.')
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, 'Enter an amount greater than zero.'),
  paidBy: z.string().uuid('Choose who paid.'),
  date: z.string().min(1, 'Choose a date.'),
  notes: z.string().trim().max(300, 'Keep it under 300 characters.').optional(),
})

type ExpenseInput = z.input<typeof expenseSchema>
type ExpenseValues = z.output<typeof expenseSchema>

export default function NewExpensePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const friendId = searchParams.get('friendId')
  const friendName = searchParams.get('friendName')
  const groupId = searchParams.get('groupId')
  const groupName = searchParams.get('groupName')

  const [members, setMembers] = useState<Member[]>([])
  const [contextLabel, setContextLabel] = useState<string>('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [contextMode, setContextMode] = useState<'friend' | 'group' | null>(null)
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  /* ---------------------------------------------------------------------- */
  /* Load data based on URL params or fetch friends/groups                     */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      if (friendId) {
        // Fetch friend profile to ensure we have the name
        const { data: friendProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', friendId)
          .maybeSingle()
        
        const resolvedFriendName = friendProfile?.display_name ?? friendName ?? 'Friend'
        
        setContextLabel(`Splitting with ${resolvedFriendName}`)
        setMembers([
          {
            id: user.id,
            name:
              user.user_metadata.full_name ??
              user.email?.split('@')[0] ??
              'You',
          },
          { id: friendId, name: resolvedFriendName },
        ])
        setSelectedMembers([user.id, friendId])
        setSelectedContextId(friendId)
        setContextMode('friend')
      } else if (groupId) {
        setContextLabel(`Group: ${groupName ?? ''}`)
        const { data: rows } = await supabase
          .from('group_members')
          .select('profile:profiles!group_members_user_id_fkey(id, display_name)')
          .eq('group_id', groupId)

        const groupMembers: Member[] =
          (rows ?? []).map((row: any) => ({
            id: row.profile?.id ?? '',
            name: row.profile?.display_name ?? '',
          })) ?? []

        setMembers(groupMembers)
        setSelectedMembers(groupMembers.map((m) => m.id))
        setSelectedContextId(groupId)
        setContextMode('group')
      } else {
        setContextLabel('Select who you are splitting with')
        setMembers([])
        setSelectedMembers([])

        // Fetch friends
        const { data: friendRows } = await supabase
          .from('friendships')
          .select(`
            id,
            friend:profiles!friendships_friend_id_fkey(display_name)
          `)
          .eq('user_id', user.id)

        const friendList: Friend[] =
          (friendRows ?? []).map((row: any) => ({
            id: row.id,
            display_name: row.friend?.display_name ?? '',
          })) ?? []

        // Fetch groups
        const { data: groupRows } = await supabase
          .from('group_members')
          .select(`
            id,
            group:groups!group_members_group_id_fkey(name)
          `)
          .eq('user_id', user.id)

        const groupList: Group[] =
          (groupRows ?? []).map((row: any) => ({
            id: row.id,
            name: row.group?.name ?? '',
          })) ?? []

        setFriends(friendList)
        setGroups(groupList)
      }
    }

    load()
  }, [friendId, groupId, friendName, groupName, router, supabase])

  /* ---------------------------------------------------------------------- */
  /* Context selection handlers                                              */
  /* ---------------------------------------------------------------------- */
  const handleSelectFriend = (friendId: string) => {
    const friend = friends.find((f) => f.id === friendId)
    if (!friend) return

    setContextMode('friend')
    setSelectedContextId(friendId)
    setContextLabel(`Splitting with ${friend.display_name}`)
    setMembers([
      { id: 'current_user', name: 'You' },
      { id: friendId, name: friend.display_name },
    ])
    setSelectedMembers(['current_user', friendId])
  }

  const handleSelectGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    setContextMode('group')
    setSelectedContextId(groupId)
    setContextLabel(`Group: ${group.name}`)

    // Fetch group members
    async function fetchGroupMembers() {
      const supabase = createClient()
      const { data: rows } = await supabase
        .from('group_members')
        .select('profile:profiles!group_members_user_id_fkey(id, display_name)')
        .eq('group_id', groupId)

      const groupMembers: Member[] =
        (rows ?? []).map((row: any) => ({
          id: row.profile?.id ?? '',
          name: row.profile?.display_name ?? '',
        })) ?? []

      setMembers(groupMembers)
      setSelectedMembers(groupMembers.map((m) => m.id))
    }

    fetchGroupMembers()
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    )
  }

  const handleSelectAll = () => {
    setSelectedMembers(members.map((m) => m.id))
  }

  /* ---------------------------------------------------------------------- */
  /* Form handling                                                            */
  /* ---------------------------------------------------------------------- */
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput, unknown, ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: '0',
      paidBy: members[0]?.id ?? '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  const onSubmit = async (values: ExpenseValues) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const insertPayload: any = {
      description: values.title,
      amount: values.amount,
      currency: 'INR',
      paid_by: values.paidBy,
      notes: values.notes || null,
      date: values.date,
      created_by: user.id,
    }

    if (contextMode === 'friend' && selectedContextId) {
      insertPayload.friendship_id = selectedContextId
    } else if (contextMode === 'group' && selectedContextId) {
      insertPayload.group_id = selectedContextId
    }

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert(insertPayload)
      .select('id')
      .single()

    if (expenseError || !expense) {
      console.error('Failed to create expense', expenseError)
      return
    }

    const equalShare = Number(values.amount) / selectedMembers.length
    const splits = selectedMembers
      .filter((id) => id !== 'current_user')
      .map((id) => ({
        expense_id: expense.id,
        user_id: id,
        amount: equalShare,
      }))

    const { error: splitsError } = await supabase.from('expense_splits').insert(splits)
    if (splitsError) {
      console.error('Failed to create splits', splitsError)
    }

    if (contextMode === 'friend' && selectedContextId) {
      router.push(`/friends/${selectedContextId}`)
    } else if (contextMode === 'group' && selectedContextId) {
      router.push(`/groups/${selectedContextId}`)
    } else {
      router.push('/')
    }
  }

  /* ---------------------------------------------------------------------- */
  /* UI – form with SplitTabs                                                 */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">{contextLabel}</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">
            New expense
          </h1>
        </div>

        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <a href="javascript:history.back()">Cancel</a>
        </Button>
      </section>

      {/* Context selection if no params */}
      {!friendId && !groupId && (
        <Card className="p-4">
          <div className="mb-4">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Who are you splitting with?
            </p>
          </div>
          <div className="flex gap-2 mb-4">
            <Button
              variant={contextMode === 'friend' ? 'primary' : 'secondary'}
              onClick={() => setContextMode('friend')}
              className="flex-1"
            >
              Friend
            </Button>
            <Button
              variant={contextMode === 'group' ? 'primary' : 'secondary'}
              onClick={() => setContextMode('group')}
              className="flex-1"
            >
              Group
            </Button>
          </div>

          {contextMode === 'friend' && (
            <div className="space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend.id)}
                  className={`w-full text-left p-3 rounded border ${
                    selectedContextId === friend.id
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-surface-raised'
                  }`}
                  style={{ touchAction: 'manipulation', minHeight: '56px' }}
                >
                  {friend.display_name}
                </button>
              ))}
              {friends.length === 0 && (
                <p className="text-sm text-muted-light">No friends found.</p>
              )}
            </div>
          )}

          {contextMode === 'group' && (
            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  className={`w-full text-left p-3 rounded border ${
                    selectedContextId === group.id
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-surface-raised'
                  }`}
                  style={{ touchAction: 'manipulation', minHeight: '56px' }}
                >
                  {group.name}
                </button>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-muted-light">No groups found.</p>
              )}
            </div>
          )}
        </Card>
      )}

      {members.length > 0 && (
        <>
          <SplitTabs
            members={members}
            totalAmount={Number(watch('amount')) || 0}
            selectedMembers={selectedMembers}
            onMemberToggle={handleMemberToggle}
            onSelectAll={handleSelectAll}
          />

          <Card className="p-5">
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Input
                label="Title"
                placeholder="Dinner, movie, ride"
                error={errors.title?.message}
                {...register('title')}
              />
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                error={errors.amount?.message}
                {...register('amount')}
              />
              <div>
                <label
                  htmlFor="paidBy"
                  className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground"
                >
                  Paid by
                </label>
                <select
                  id="paidBy"
                  className="theme-input h-11 w-full px-3 text-sm"
                  aria-invalid={errors.paidBy ? true : undefined}
                  {...register('paidBy')}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  placeholder="Optional notes"
                  className="theme-input w-full resize-none px-3 py-3 text-sm placeholder:text-muted"
                  aria-invalid={errors.notes ? true : undefined}
                  {...register('notes')}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <a href="javascript:history.back()">Cancel</a>
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? 'Saving expense' : 'Save expense'}
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  )
}