'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/client'

const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Enter at least 2 characters.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const handleGoogleSignUp = async () => {
    setAuthError(null)
    setSuccessMessage(null)
    setIsGoogleLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setAuthError(error.message)
      setIsGoogleLoading(false)
    }
  }

  const onSubmit = async (values: RegisterFormValues) => {
    setAuthError(null)
    setSuccessMessage(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.displayName,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setAuthError(error.message)
      return
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    setSuccessMessage('Check your email to confirm your account, then sign in.')
  }

  const inputClassName =
    'mt-2 h-12 w-full rounded-md border border-[#463933] bg-[#171412] px-3 text-base text-[#fff7ef] outline-none transition placeholder:text-[#76675f] focus:border-[#d97745] focus:ring-2 focus:ring-[#d97745]/25'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#d97745]">
          ShareSplit
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#fff7ef]">
          Make splitting feel lighter
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#b9aaa1]">
          Create an account to keep shared expenses clear and settle up without the awkward
          math.
        </p>
      </div>

      <section className="rounded-lg border border-[#342b27] bg-[#1f1b19] p-5 shadow-2xl shadow-black/30 sm:p-6">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#4a3d37] bg-[#f8efe7] px-4 text-sm font-semibold text-[#171412] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-[#d97745]">
            G
          </span>
          {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#3a302b]" />
          <span className="text-xs uppercase tracking-[0.16em] text-[#8f7f76]">or</span>
          <div className="h-px flex-1 bg-[#3a302b]" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="displayName" className="text-sm font-medium text-[#ead9cc]">
              Name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              className={inputClassName}
              {...register('displayName')}
            />
            {errors.displayName ? (
              <p className="mt-2 text-sm text-[#ffad8a]">{errors.displayName.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-[#ead9cc]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClassName}
              {...register('email')}
            />
            {errors.email ? (
              <p className="mt-2 text-sm text-[#ffad8a]">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-[#ead9cc]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={inputClassName}
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-2 text-sm text-[#ffad8a]">{errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-[#ead9cc]">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              className={inputClassName}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="mt-2 text-sm text-[#ffad8a]">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {authError ? (
            <p className="rounded-md border border-[#7f3c2a] bg-[#2a1814] px-3 py-2 text-sm text-[#ffb199]">
              {authError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-[#596533] bg-[#1b2114] px-3 py-2 text-sm text-[#d9e9a8]">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="h-12 w-full rounded-md bg-[#d97745] px-4 text-sm font-semibold text-[#171412] transition hover:bg-[#f08a52] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </section>

      <p className="mt-6 text-center text-sm text-[#a99990]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[#f2b17f] hover:text-[#ffd0aa]">
          Sign in
        </Link>
      </p>
    </div>
  )
}
