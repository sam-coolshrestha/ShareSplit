'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  CustomSplitPanel,
  type CustomSplitMode,
  type CustomSplitValue,
  type Member,
} from '@/components/groups/CustomSplitPanel'
import { ItemizedSplitPanel, type ItemizedLineItem } from '@/components/groups/ItemizedSplitPanel'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

const expenseSchema = z.object({
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
  selectedMembers: z.array(z.string().uuid()).min(1, 'Select at least one person for this split.'),
})

type ExpenseFormInput = z.input<typeof expenseSchema>
type ExpenseFormValues = z.output<typeof expenseSchema>
type SplitTab = 'equal' | 'custom' | 'itemized'

type EqualExpenseFormProps = {
  currency: string
  groupId: string
  groupName: string
  members: Member[]
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

function toNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isCloseEnough(left: number, right: number) {
  return Math.abs(Math.round(left * 100) - Math.round(right * 100)) <= 1
}

function makeItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function EqualExpenseForm({ currency, groupId, groupName, members }: EqualExpenseFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [splitTab, setSplitTab] = useState<SplitTab>('equal')
  const [customMode, setCustomMode] = useState<CustomSplitMode>('exact')
  const [customValues, setCustomValues] = useState<CustomSplitValue[]>(
    members.map((member) => ({ memberId: member.id, value: '' }))
  )
  const [itemizedItems, setItemizedItems] = useState<ItemizedLineItem[]>([
    { id: makeItemId(), description: '', amount: '', claimedBy: members.map((member) => member.id) },
  ])
  const [splitError, setSplitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: '0',
      paidBy: members[0]?.id ?? '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
      selectedMembers: members.map((member) => member.id),
    },
  })

  const watchedAmount = watch('amount')
  const selectedMembers = watch('selectedMembers') ?? []
  const parsedAmount = typeof watchedAmount === 'number' ? watchedAmount : Number.parseFloat(watchedAmount || '0')

  const splitMembers = useMemo(
    () => members.filter((member) => selectedMembers.includes(member.id)),
    [members, selectedMembers]
  )

  const equalShare =
    Number.isFinite(parsedAmount) && splitMembers.length > 0 && parsedAmount > 0 ? parsedAmount / splitMembers.length : 0

  const setCustomValue = (memberId: string, value: string) => {
    setCustomValues((current) => current.map((entry) => (entry.memberId === memberId ? { ...entry, value } : entry)))
  }

  const fillCustomEqual = () => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !members.length) return
    const values =
      customMode === 'percentage'
        ? splitAmountEvenly(100, members.length).map((share) => share.toFixed(2))
        : splitAmountEvenly(parsedAmount, members.length).map((share) => share.toFixed(2))

    setCustomValues(members.map((member, index) => ({ memberId: member.id, value: values[index] ?? '' })))
  }

  const updateItem = (itemId: string, updates: Partial<Omit<ItemizedLineItem, 'id'>>) => {
    setItemizedItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)))
  }

  const buildCustomShares = (amount: number) => {
    const shares = customValues
      .map((entry) => ({
        memberId: entry.memberId,
        amount: customMode === 'percentage' ? (amount * toNumber(entry.value)) / 100 : toNumber(entry.value),
      }))
      .filter((entry) => entry.amount > 0)

    const enteredTotal = customValues.reduce((sum, entry) => sum + toNumber(entry.value), 0)
    const expectedTotal = customMode === 'percentage' ? 100 : amount

    if (!shares.length) return { error: 'Enter at least one custom share.', shares: [] }
    if (!isCloseEnough(enteredTotal, expectedTotal)) {
      return {
        error:
          customMode === 'percentage'
            ? 'Custom percentages must add up to 100%.'
            : 'Custom amounts must add up to the expense total.',
        shares: [],
      }
    }

    return { error: null, shares }
  }

  const buildItemizedData = (amount: number) => {
    const preparedItems = itemizedItems.map((item) => ({
      ...item,
      amountNumber: toNumber(item.amount),
      description: item.description.trim(),
    }))

    if (preparedItems.some((item) => item.description.length < 1 || item.amountNumber <= 0)) {
      return { error: 'Every line item needs a name and amount greater than zero.', shares: [], items: [] }
    }

    if (preparedItems.some((item) => item.claimedBy.length < 1)) {
      return { error: 'Every line item needs at least one claimant.', shares: [], items: [] }
    }

    const itemTotal = preparedItems.reduce((sum, item) => sum + item.amountNumber, 0)
    if (!isCloseEnough(itemTotal, amount)) {
      return { error: 'Line item amounts must add up to the expense total.', shares: [], items: [] }
    }

    const shareMap = new Map<string, number>()
    for (const item of preparedItems) {
      const shares = splitAmountEvenly(item.amountNumber, item.claimedBy.length)
      item.claimedBy.forEach((memberId, index) => {
        shareMap.set(memberId, (shareMap.get(memberId) ?? 0) + (shares[index] ?? 0))
      })
    }

    return {
      error: null,
      shares: Array.from(shareMap, ([memberId, shareAmount]) => ({ memberId, amount: shareAmount })),
      items: preparedItems,
    }
  }

  const onSubmit = async (values: ExpenseFormValues) => {
    setFormError(null)
    setSplitError(null)

    const splitType = splitTab === 'equal' ? 'equal' : splitTab === 'itemized' ? 'itemized' : customMode
    const splitData =
      splitTab === 'equal'
        ? {
            error: null,
            shares: values.selectedMembers.map((memberId, index) => ({
              memberId,
              amount: splitAmountEvenly(values.amount, values.selectedMembers.length)[index] ?? 0,
            })),
            items: [],
          }
        : splitTab === 'custom'
          ? { ...buildCustomShares(values.amount), items: [] }
          : buildItemizedData(values.amount)

    if (splitData.error) {
      setSplitError(splitData.error)
      return
    }

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
        group_id: groupId,
        friendship_id: null,
        split_type: splitType,
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

    const { error: splitsError } = await supabase.from('expense_splits').insert(
      splitData.shares.map((share) => ({
        expense_id: expense.id,
        user_id: share.memberId,
        amount: share.amount,
      }))
    )

    if (splitsError) {
      setFormError(splitsError.message)
      return
    }

    if (splitTab === 'itemized' && splitData.items.length) {
      for (const item of splitData.items) {
        const { data: expenseItem, error: itemError } = await supabase
          .from('expense_items')
          .insert({
            expense_id: expense.id,
            description: item.description,
            amount: item.amountNumber,
          })
          .select('id')
          .single()

        if (itemError || !expenseItem) {
          setFormError(itemError?.message ?? 'Could not save itemized details.')
          return
        }

        const itemShares = splitAmountEvenly(item.amountNumber, item.claimedBy.length)
        const { error: claimsError } = await supabase.from('item_claims').insert(
          item.claimedBy.map((memberId, index) => ({
            item_id: expenseItem.id,
            user_id: memberId,
            share_amount: itemShares[index] ?? 0,
          }))
        )

        if (claimsError) {
          setFormError(claimsError.message)
          return
        }
      }
    }

    router.push(`/groups/${groupId}`)
    router.refresh()
  }

  const splitTabs: Array<{ id: SplitTab; label: string }> = [
    { id: 'equal', label: 'Equal' },
    { id: 'custom', label: 'Custom' },
    { id: 'itemized', label: 'Itemized' },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 md:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="primary">{currency}</Badge>
          <h1 className="mt-4 font-display text-4xl leading-none text-foreground sm:text-5xl">New expense</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light sm:text-base">
            Add a group expense for {groupName} and choose the split that matches the bill.
          </p>
        </div>

        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href={`/groups/${groupId}`}>Back to group</Link>
        </Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card priority className="p-5 sm:p-7">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input label="Title" placeholder="Dinner, rent, groceries" error={errors.title?.message} {...register('title')} />

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
              {errors.paidBy ? <p className="mt-2 text-xs text-error">{errors.paidBy.message}</p> : null}
            </div>

            <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />

            <div>
              <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Split type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {splitTabs.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={splitTab === tab.id ? 'primary' : 'secondary'}
                    className="min-h-11 px-2 text-xs"
                    onClick={() => {
                      setSplitTab(tab.id)
                      setSplitError(null)
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {splitTab === 'equal' ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    Split amongst
                  </label>
                  <button
                    type="button"
                    className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-primary"
                    onClick={() =>
                      setValue(
                        'selectedMembers',
                        members.map((member) => member.id),
                        { shouldValidate: true }
                      )
                    }
                  >
                    Select all
                  </button>
                </div>
                <div className="space-y-3">
                  {members.map((member) => {
                    const checked = selectedMembers.includes(member.id)

                    return (
                      <label key={member.id} className="theme-card flex cursor-pointer items-center justify-between gap-4 bg-surface-raised px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar alt={member.name} fallback={member.name} size="sm" />
                          <div>
                            <p className="text-sm font-bold text-foreground">{member.name}</p>
                            <p className="font-mono text-[0.625rem] uppercase tracking-widest text-muted">Included in split</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          value={member.id}
                          checked={checked}
                          className="h-5 w-5 accent-[var(--color-primary)]"
                          onChange={(event) => {
                            const nextSelection = event.target.checked
                              ? [...selectedMembers, member.id]
                              : selectedMembers.filter((id) => id !== member.id)

                            setValue('selectedMembers', nextSelection, { shouldValidate: true, shouldDirty: true })
                          }}
                        />
                      </label>
                    )
                  })}
                </div>
                {errors.selectedMembers ? <p className="mt-2 text-xs text-error">{errors.selectedMembers.message}</p> : null}
              </div>
            ) : null}

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
              {errors.notes ? <p className="mt-2 text-xs text-error">{errors.notes.message}</p> : null}
            </div>

            {formError ? (
              <p className="border-[length:var(--border-width)] border-error bg-surface-raised px-3 py-2 text-sm text-error">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link href={`/groups/${groupId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? 'Saving expense' : 'Save expense'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b-[length:var(--border-width)] border-border bg-surface-raised p-5 sm:p-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {splitTab === 'equal' ? 'Equal split' : splitTab === 'custom' ? 'Custom split' : 'Itemized split'}
            </p>
            <h2 className="mt-3 font-display text-3xl text-foreground">How this will split</h2>
          </div>

          {splitTab === 'equal' ? (
            <div className="p-5 sm:p-6">
              <div className="theme-chip mb-5 inline-flex px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-light">
                {splitMembers.length} selected
              </div>
              <div className="space-y-3">
                {splitMembers.map((member) => (
                  <div key={member.id} className="theme-card flex items-center justify-between gap-4 bg-surface-raised px-4 py-4">
                    <div>
                      <p className="font-label text-sm font-bold text-foreground">{member.name}</p>
                      <p className="mt-1 font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Equal share</p>
                    </div>
                    <p className="font-display text-2xl text-primary">{formatCurrency(equalShare || 0, currency)}</p>
                  </div>
                ))}
                {!splitMembers.length ? (
                  <div className="theme-card bg-surface-raised px-4 py-6 text-center text-sm text-muted-light">
                    Pick at least one member to calculate the split preview.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {splitTab === 'custom' ? (
            <CustomSplitPanel
              currency={currency}
              members={members}
              mode={customMode}
              values={customValues}
              totalAmount={Number.isFinite(parsedAmount) ? parsedAmount : 0}
              error={splitError}
              onModeChange={(mode) => {
                setCustomMode(mode)
                setSplitError(null)
              }}
              onValueChange={setCustomValue}
              onFillEqual={fillCustomEqual}
            />
          ) : null}

          {splitTab === 'itemized' ? (
            <ItemizedSplitPanel
              currency={currency}
              items={itemizedItems}
              members={members}
              totalAmount={Number.isFinite(parsedAmount) ? parsedAmount : 0}
              error={splitError}
              onAddItem={() =>
                setItemizedItems((current) => [
                  ...current,
                  { id: makeItemId(), description: '', amount: '', claimedBy: members.map((member) => member.id) },
                ])
              }
              onRemoveItem={(itemId) => setItemizedItems((current) => current.filter((item) => item.id !== itemId))}
              onItemChange={updateItem}
            />
          ) : null}
        </Card>
      </div>
    </div>
  )
}
