'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const getRedirectPath = () => {
    const redirectedFrom = searchParams.get('redirectedFrom')
    return redirectedFrom && redirectedFrom.startsWith('/') ? redirectedFrom : '/dashboard'
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null)
    setIsGoogleLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      getRedirectPath()
    )}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      setAuthError(error.message)
      setIsGoogleLoading(false)
    }
  }

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setAuthError(error.message)
      return
    }

    router.push(getRedirectPath())
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#d97745]">
          ShareSplit
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#fff7ef]">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#b9aaa1]">
          Sign in to settle expenses, keep groups clear, and get back to the calm part.
        </p>
      </div>

      <section className="rounded-lg border border-[#342b27] bg-[#1f1b19] p-5 shadow-2xl shadow-black/30 sm:p-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
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
            <label htmlFor="email" className="text-sm font-medium text-[#ead9cc]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 h-12 w-full rounded-md border border-[#463933] bg-[#171412] px-3 text-base text-[#fff7ef] outline-none transition placeholder:text-[#76675f] focus:border-[#d97745] focus:ring-2 focus:ring-[#d97745]/25"
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
              autoComplete="current-password"
              placeholder="Your password"
              className="mt-2 h-12 w-full rounded-md border border-[#463933] bg-[#171412] px-3 text-base text-[#fff7ef] outline-none transition placeholder:text-[#76675f] focus:border-[#d97745] focus:ring-2 focus:ring-[#d97745]/25"
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-2 text-sm text-[#ffad8a]">{errors.password.message}</p>
            ) : null}
          </div>

          {authError ? (
            <p className="rounded-md border border-[#7f3c2a] bg-[#2a1814] px-3 py-2 text-sm text-[#ffb199]">
              {authError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="h-12 w-full rounded-md bg-[#d97745] px-4 text-sm font-semibold text-[#171412] transition hover:bg-[#f08a52] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>

      <p className="mt-6 text-center text-sm text-[#a99990]">
        New to ShareSplit?{' '}
        <Link href="/register" className="font-semibold text-[#f2b17f] hover:text-[#ffd0aa]">
          Create an account
        </Link>
      </p>
    </div>
  )
}
