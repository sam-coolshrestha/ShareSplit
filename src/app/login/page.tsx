import { Suspense } from 'react'

import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#151312] px-4 py-6 text-[#f8efe7] sm:px-6">
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center text-sm text-[#b9aaa1]">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
