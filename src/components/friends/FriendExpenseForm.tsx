'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

const friendExpenseSchema = z.object({
  title: z.string().trim().min(2, 'Use at least 2 characters.').max(120, 'Keep it under 120 characters.'),
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount greater than zero.')
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, 'Enter an amount greater than zero.'),
  paidBy: z.string().uuid('Choose who paid.'),
  date: z.string().min(1, 'Choose a date.'),
  notes: z.string().trim().max(300, 'Keep it under 300 characters.').optional(),
})

type FriendExpenseInput = z.input<typeof friendExpenseSchema>
type FriendExpenseValues = z.output<typeof friendExpenseSchema>

type FriendMember = {
  id: string
  name: string
}

function splitAmountEvenly(amount: number, memberCount: number) {
  const totalPaise = Math.round(amount * 100)
  const baseShare = Math.floor(totalPaise / memberCount)
  const remainder = totalPaise % memberCount

  return Array.from({ length: memberCount }, (_, index) => (baseShare + (index < remainder ? 1 : 0)) / 100)
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function FriendExpenseForm({
  currency,
  friendshipId,
  friendName,
  members,
}: {
  currency: string
  friendshipId: string
  friendName: string
  members: FriendMember[]
}) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FriendExpenseInput, unknown, FriendExpenseValues>({
    resolver: zodResolver(friendExpenseSchema),
    defaultValues: {
      title: '',
      amount: '0',
      paidBy: members[0]?.id ?? '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  const watchedAmount = watch('amount')
  const parsedAmount = typeof watchedAmount === 'number' ? watchedAmount : Number.parseFloat(watchedAmount || '0')
  const equalShare = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount / members.length : 0

  const onSubmit = async (values: FriendExpenseValues) => {
    setFormError(null)

    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.replace('/login')
      router.refresh()
      return
    }

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        description: values.title,
        amount: values.amount,
        currency,
        paid_by: values.paidBy,
        group_id: null,
        friendship_id: friendshipId,
        split_type: 'equal',
        date: values.date,
        notes: values.notes || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (expenseError || !expense) {
      setFormError(expenseError?.message ?? 'Could not save the expense.')
      return
    }

    const shares = splitAmountEvenly(values.amount, members.length)
    const { error: splitsError } = await supabase.from('expense_splits').insert(
      members.map((member, index) => ({
        expense_id: expense.id,
        user_id: member.id,
        amount: shares[index],
      }))
    )

    if (splitsError) {
      setFormError(splitsError.message)
      return
    }

    router.push(`/friends/${friendshipId}`)
    router.refresh()
  }

  return (
    <div className="page-shell space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">{currency}</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">New friend expense</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            Add a shared expense with {friendName} and ShareSplit will update the balance automatically.
          </p>
        </div>

        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href={`/friends/${friendshipId}`}>Back to friend</Link>
        </Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card priority className="p-5 sm:p-7">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input label="Title" placeholder="Dinner, movie, ride" error={errors.title?.message} {...register('title')} />
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              error={errors.amount?.message}
              {...register('amount')}
            />
            <div>
              <label htmlFor="paidBy" className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Paid by
              </label>
              <select id="paidBy" className="theme-input h-11 w-full px-3 text-sm" aria-invalid={errors.paidBy ? true : undefined} {...register('paidBy')}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
            <div>
              <label htmlFor="notes" className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Notes
              </label>
              <textarea
                id="notes"
                rows={5}
                placeholder="Optional context, receipt notes, or anything useful."
                className="theme-input w-full resize-none px-3 py-3 text-sm placeholder:text-muted"
                aria-invalid={errors.notes ? true : undefined}
                {...register('notes')}
              />
            </div>
            {formError ? (
              <p className="border-[length:var(--border-width)] border-error bg-surface-raised px-3 py-2 text-sm text-error">
                {formError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link href={`/friends/${friendshipId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? 'Saving expense' : 'Save expense'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b-[length:var(--border-width)] border-border bg-surface-raised p-5 sm:p-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Equal split</p>
            <h2 className="mt-3 font-display text-3xl text-foreground">How this will split</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="theme-card flex items-center justify-between gap-4 bg-surface-raised px-4 py-4">
                  <div>
                    <p className="font-label text-sm font-bold text-foreground">{member.name}</p>
                    <p className="mt-1 font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Equal share</p>
                  </div>
                  <p className="font-display text-2xl text-primary">{formatCurrency(equalShare || 0, currency)}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
