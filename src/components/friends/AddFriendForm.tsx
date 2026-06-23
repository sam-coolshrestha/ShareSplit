'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

const addFriendSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
})

type AddFriendValues = z.infer<typeof addFriendSchema>

export function AddFriendForm() {
  const router = useRouter()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFriendValues>({
    resolver: zodResolver(addFriendSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }: AddFriendValues) => {
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.rpc('create_friendship_by_email', {
      invited_email: email,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    reset()
    setMessage({ type: 'success', text: 'Friend added.' })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label="Friend email"
        type="email"
        autoComplete="email"
        placeholder="friend@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      {message ? (
        <p className={message.type === 'error' ? 'text-sm text-error' : 'text-sm text-success'}>
          {message.text}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Adding' : 'Add friend'}
      </Button>
    </form>
  )
}
