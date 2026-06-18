'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/utils'
import { useTheme } from '@/lib/hooks/useTheme'
import { createClient } from '@/lib/supabase/client'

type AppShellProps = {
  children: ReactNode
  pendingInviteCount?: number
  user: {
    displayName: string
    email: string
    avatarUrl: string | null
  }
}

type IconProps = {
  className?: string
}

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { label: 'Groups', href: '/groups', icon: GroupsIcon },
  { label: 'Friends', href: '/friends', icon: FriendsIcon },
  { label: 'Activity', href: '/activity', icon: ActivityIcon },
]

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ children, user, pendingInviteCount = 0 }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)

    const supabase = createClient()
    await supabase.auth.signOut()

    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 240 : 64 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 left-0 z-40 hidden border-r-[length:var(--border-width)] border-border bg-surface md:flex md:flex-col"
      >
        <div className="flex h-16 items-center border-b-[length:var(--border-width)] border-border px-3">
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isExpanded}
            className="theme-chip flex h-10 w-full items-center gap-3 overflow-hidden px-2 text-foreground transition hover:bg-surface-high"
          >
            <LogoMark className="h-5 w-5 shrink-0 text-primary" />
            <AnimatePresence initial={false}>
              {isExpanded ? (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="whitespace-nowrap font-display text-xl"
                >
                  ShareSplit
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-2 py-5" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isActiveRoute(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                title={isExpanded ? undefined : item.label}
                className={cn(
                  'relative flex min-h-11 items-center gap-3 overflow-hidden rounded-md px-3 font-mono text-xs font-bold uppercase tracking-wider transition',
                  active
                    ? 'bg-primary text-ink'
                    : 'text-muted-light hover:bg-surface-raised hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.href === '/dashboard' && pendingInviteCount > 0 && !isExpanded ? (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[0.5625rem] text-ink">
                    {pendingInviteCount > 9 ? '9+' : pendingInviteCount}
                  </span>
                ) : null}
                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                      {item.href === '/dashboard' && pendingInviteCount > 0 ? (
                        <span className="ml-2 inline-grid h-5 min-w-5 place-items-center rounded-full bg-error px-1 text-[0.625rem] text-ink">
                          {pendingInviteCount > 9 ? '9+' : pendingInviteCount}
                        </span>
                      ) : null}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        <div className="border-t-[length:var(--border-width)] border-border p-2">
          <div className="flex items-center gap-3 overflow-hidden px-2 py-2">
            <Avatar src={user.avatarUrl} alt={user.displayName} fallback={user.displayName} size="sm" />
            {isExpanded ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-w-0"
              >
                <p className="truncate text-sm font-bold text-foreground">{user.displayName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </motion.div>
            ) : null}
          </div>
        </div>
      </motion.aside>

      <motion.div
        initial={false}
        animate={{ marginLeft: isExpanded ? 240 : 64 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="hidden md:block"
      >
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          isSigningOut={isSigningOut}
          onSignOut={handleSignOut}
        />
        <main className="min-h-[calc(100vh-64px)] p-6 lg:p-8">{children}</main>
      </motion.div>

      <div className="pb-24 md:hidden">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          isSigningOut={isSigningOut}
          onSignOut={handleSignOut}
        />
        <main className="min-h-[calc(100vh-64px)] p-4">{children}</main>
        <MobileNavigation pathname={pathname} pendingInviteCount={pendingInviteCount} />
      </div>
    </div>
  )
}

type TopbarProps = {
  theme: 'comic' | 'modern'
  toggleTheme: () => void
  user: AppShellProps['user']
  isSigningOut: boolean
  onSignOut: () => void
}

function Topbar({ theme, toggleTheme, user, isSigningOut, onSignOut }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-[length:var(--border-width)] border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <div>
        <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-primary">
          ShareSplit
        </p>
        <p className="hidden text-sm text-muted-light sm:block">Welcome back, {user.displayName}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <Avatar src={user.avatarUrl} alt={user.displayName} fallback={user.displayName} size="sm" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="px-2 sm:px-3"
        >
          <SignOutIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{isSigningOut ? 'Signing out' : 'Sign out'}</span>
        </Button>
      </div>
    </header>
  )
}

function ThemeToggle({ theme, toggleTheme }: Pick<TopbarProps, 'theme' | 'toggleTheme'>) {
  const isModern = theme === 'modern'

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      aria-label={`Switch to ${isModern ? 'comic' : 'modern'} mode`}
      title={`Switch to ${isModern ? 'comic' : 'modern'} mode`}
      className="theme-chip relative flex h-9 w-[4.5rem] items-center px-1"
    >
      <motion.span
        initial={false}
        animate={{ x: isModern ? 34 : 0, rotate: isModern ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="grid h-7 w-7 place-items-center rounded-full bg-primary text-ink"
      >
        {isModern ? <ModernIcon className="h-4 w-4" /> : <ComicIcon className="h-4 w-4" />}
      </motion.span>
    </motion.button>
  )
}

function MobileNavigation({
  pathname,
  pendingInviteCount,
}: {
  pathname: string
  pendingInviteCount: number
}) {
  return (
    <nav
      className="floating-nav fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 px-1 py-2"
      aria-label="Mobile navigation"
    >
      {navigation.map((item) => {
        const Icon = item.icon
        const active = isActiveRoute(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 font-mono text-[0.625rem] font-bold uppercase tracking-wide transition',
              active ? 'bg-primary text-ink' : 'text-muted-light'
            )}
          >
            <Icon className="h-5 w-5" />
            {item.href === '/dashboard' && pendingInviteCount > 0 ? (
              <span className="absolute right-2 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[0.5625rem] text-ink">
                {pendingInviteCount > 9 ? '9+' : pendingInviteCount}
              </span>
            ) : null}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function LogoMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 4h14M5 10h9M5 16h14M9 4v16" />
    </svg>
  )
}

function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  )
}

function GroupsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M15 15c3 0 5 1.5 5 5" />
    </svg>
  )
}

function FriendsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
    </svg>
  )
}

function ActivityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  )
}

function SignOutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
    </svg>
  )
}

function ComicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m12 2 2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z" />
    </svg>
  )
}

function ModernIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  )
}
