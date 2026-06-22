'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'] as const

const groupSchema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters.').max(80, 'Keep it under 80 characters.'),
  description: z.string().trim().max(240, 'Keep it under 240 characters.').optional(),
  currency: z.enum(currencies),
})

type GroupFormValues = z.infer<typeof groupSchema>

export function GroupForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'INR',
    },
  })

  const onSubmit = async (values: GroupFormValues) => {
    setFormError(null)

    const supabase = createClient()
    const { data: groupId, error } = await supabase.rpc('create_group_with_admin_membership', {
      group_name: values.name,
      group_description: values.description ?? '',
      group_currency: values.currency,
    })

    if (error || !groupId) {
      setFormError(error?.message ?? 'Could not create the group.')
      return
    }

    router.push(`/groups/${groupId}`)
    router.refresh()
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Group name"
        placeholder="Goa trip, Apartment 4B, Sunday dinners"
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <label htmlFor="description" className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="What expenses belong in this group?"
          className="theme-input w-full resize-none px-3 py-3 text-sm placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50"
          aria-invalid={errors.description ? true : undefined}
          {...register('description')}
        />
        {errors.description ? (
          <p className="mt-2 text-xs text-error">{errors.description.message}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-light">Optional. You can refine it later.</p>
        )}
      </div>

      <div>
        <label htmlFor="currency" className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          Currency
        </label>
        <select
          id="currency"
          className="theme-input h-11 w-full px-3 text-sm"
          aria-invalid={errors.currency ? true : undefined}
          {...register('currency')}
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        {errors.currency ? (
          <p className="mt-2 text-xs text-error">{errors.currency.message}</p>
        ) : null}
      </div>

      {formError ? (
        <p className="border-[length:var(--border-width)] border-error bg-surface-raised px-3 py-2 text-sm text-error">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href="/groups" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Creating' : 'Create group'}
        </Button>
      </div>
    </form>
  )
}
