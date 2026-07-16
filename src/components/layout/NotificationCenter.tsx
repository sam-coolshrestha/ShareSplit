'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import type { NotificationItem } from '@/lib/activity'

type NotificationCenterProps = {
  notifications: NotificationItem[]
  unreadCount: number
}

export function NotificationCenter({
  notifications: initialNotifications,
  unreadCount,
}: NotificationCenterProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isPending, startTransition] = useTransition()

  const toggleRead = (id: string, nextReadState: boolean) => {
    startTransition(async () => {
      const supabase = createClient()
      const rpcName = nextReadState ? 'mark_notification_read' : 'mark_notification_unread'
      const { error } = await supabase.rpc(rpcName, { target_notification_id: id })

      if (error) return

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, isRead: nextReadState } : notification
        )
      )
      router.refresh()
    })
  }

  const markAllRead = () => {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc('mark_all_notifications_read')

      if (error) return

      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
      router.refresh()
    })
  }

  const liveUnreadCount = notifications.filter((notification) => !notification.isRead).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className="theme-chip relative flex min-h-11 min-w-11 items-center justify-center px-3 text-foreground"
      >
        <BellIcon className="h-5 w-5" />
        {(liveUnreadCount || unreadCount) > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-ink">
            {(liveUnreadCount || unreadCount) > 9 ? '9+' : liveUnreadCount || unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <Card className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(24rem,calc(100vw-2rem))] p-0">
          <div className="flex items-center justify-between gap-3 border-b-[length:var(--border-width)] border-border px-4 py-4">
            <div>
              <p className="font-display text-2xl text-foreground">Notifications</p>
              <p className="text-xs text-muted-light">{liveUnreadCount} unread</p>
            </div>
            <Button size="sm" variant="secondary" disabled={isPending || liveUnreadCount === 0} onClick={markAllRead}>
              Mark all read
            </Button>
          </div>

          <div className="max-h-[70dvh] overflow-y-auto p-4">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[inherit] border-[length:var(--border-width)] border-border bg-surface-raised p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                        {notification.body ? (
                          <p className="mt-1 text-sm leading-6 text-muted-light">{notification.body}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted">{notification.relativeTime}</p>
                      </div>
                      {!notification.isRead ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {notification.linkHref ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={notification.linkHref} onClick={() => setIsOpen(false)}>
                            Open
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => toggleRead(notification.id, !notification.isRead)}
                      >
                        Mark as {notification.isRead ? 'unread' : 'read'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="font-display text-2xl text-foreground">All caught up</p>
                <p className="mt-2 text-sm text-muted-light">New expenses, reminders, and settlements will appear here.</p>
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4M10 21a2 2 0 0 0 4 0" />
    </svg>
  )
}
