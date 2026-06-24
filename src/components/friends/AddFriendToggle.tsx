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

export function AddFriendToggle() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
    setMessage({ type: 'success', text: 'Friend added!' })
    router.refresh()

    // Auto-collapse after success
    setTimeout(() => {
      setOpen(false)
      setMessage(null)
    }, 1800)
  }

  const handleToggle = () => {
    setOpen((prev) => !prev)
    if (open) {
      reset()
      setMessage(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle button */}
      <div>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-[length:var(--border-width)] border-border bg-surface-raised px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-foreground hover:bg-surface-high transition-colors"
          style={{ touchAction: 'manipulation', minHeight: 44 }}
          aria-expanded={open}
        >
          <span
            aria-hidden
            className="inline-block transition-transform duration-200"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            ＋
          </span>
          Add Friend
        </button>
      </div>

      {/* Inline expandable form */}
      {open && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
          noValidate
        >
          <div className="flex-1">
            <Input
              label=""
              type="email"
              autoComplete="email"
              placeholder="friend@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <div className="flex gap-2 sm:pt-0">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? 'Adding…' : 'Add'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleToggle}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {message ? (
        <p className={message.type === 'error' ? 'text-sm text-error' : 'text-sm text-success'}>
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
