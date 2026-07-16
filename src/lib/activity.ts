export type ActivityKind =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'group_created'
  | 'friend_added'
  | 'settlement_completed'
  | 'reminder_sent'
  | 'balance_update'
  | 'added_to_group'

export type ActivityParticipant = {
  userId: string
  name: string
  share: number
  owesText?: string
  canSendReminder?: boolean
}

export type ReminderTarget = {
  userId: string
  name: string
}

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  occurredAt: string
  relativeTime: string
  totalAmount?: number
  currency?: string
  payerText?: string
  yourShare?: number
  yourDelta?: number
  createdByText?: string
  note?: string | null
  linkHref?: string
  viewLabel?: string
  participants?: ActivityParticipant[]
  reminderTargets?: ReminderTarget[]
  canDelete?: boolean
  expenseId?: string
}

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  linkHref: string | null
  isRead: boolean
  createdAt: string
  relativeTime: string
}

export function toMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

export function getSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatRelativeTime(value: string) {
  const targetTime = new Date(value).getTime()
  const nowTime = Date.now()
  const diffInSeconds = Math.round((targetTime - nowTime) / 1000)

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  for (const [unit, seconds] of units) {
    if (Math.abs(diffInSeconds) >= seconds) {
      return formatter.format(Math.round(diffInSeconds / seconds), unit)
    }
  }

  return formatter.format(diffInSeconds, 'second')
}

type ExpenseActivitySource = {
  id: string
  description: string
  amount: number | string | null
  currency: string
  paid_by: string
  created_by: string
  created_at: string
  updated_at: string
  date: string
  notes?: string | null
  is_deleted?: boolean
  expense_splits:
    | Array<{
        user_id: string
        amount: number | string | null
      }>
    | null
  payerName: string
  creatorName: string
  contextName?: string | null
  contextHref?: string | null
  contextLabel?: string
  participantNames: Map<string, string>
}

export function buildExpenseActivityItem(
  expense: ExpenseActivitySource,
  currentUserId: string
): ActivityItem {
  const totalAmount = toMoney(expense.amount)
  const yourShare = toMoney(
    expense.expense_splits?.find((split) => split.user_id === currentUserId)?.amount ?? 0
  )
  const kind: ActivityKind = expense.is_deleted
    ? 'expense_deleted'
    : expense.updated_at !== expense.created_at
      ? 'expense_updated'
      : 'expense_added'

  const reminderTargets: ReminderTarget[] =
    expense.paid_by === currentUserId
      ? (expense.expense_splits ?? [])
          .filter((split) => split.user_id !== currentUserId && toMoney(split.amount) > 0)
          .map((split) => ({
            userId: split.user_id,
            name: expense.participantNames.get(split.user_id) ?? 'Member',
          }))
      : []

  const participants: ActivityParticipant[] = (expense.expense_splits ?? []).map((split) => {
    const share = toMoney(split.amount)
    const participantName = expense.participantNames.get(split.user_id) ?? 'Member'
    const owesText =
      split.user_id === expense.paid_by
        ? `${participantName} paid`
        : `${participantName} owes ${expense.payerName} ${formatCurrency(share, expense.currency)}`

    return {
      userId: split.user_id,
      name: participantName,
      share,
      owesText,
      canSendReminder: expense.paid_by === currentUserId && split.user_id !== currentUserId && share > 0,
    }
  })

  return {
    id: `expense-${expense.id}`,
    kind,
    title: expense.description,
    occurredAt: expense.created_at,
    relativeTime: formatRelativeTime(expense.created_at),
    totalAmount,
    currency: expense.currency,
    payerText:
      expense.paid_by === currentUserId
        ? `You paid ${formatCurrency(totalAmount, expense.currency)}`
        : `${expense.payerName} paid ${formatCurrency(totalAmount, expense.currency)}`,
    yourShare,
    yourDelta: expense.paid_by === currentUserId ? totalAmount - yourShare : -yourShare,
    createdByText:
      expense.created_by === currentUserId ? 'Added by you' : `Added by ${expense.creatorName}`,
    note: expense.notes ?? null,
    linkHref: expense.contextHref ?? undefined,
    viewLabel: expense.contextLabel ?? 'View details',
    participants,
    reminderTargets,
    canDelete: expense.created_by === currentUserId && !expense.is_deleted,
    expenseId: expense.id,
  }
}

export function buildNotificationItem(source: {
  id: string
  type: string
  title: string
  body: string | null
  link_href: string | null
  is_read: boolean
  created_at: string
}): NotificationItem {
  return {
    id: source.id,
    type: source.type,
    title: source.title,
    body: source.body,
    linkHref: source.link_href,
    isRead: source.is_read,
    createdAt: source.created_at,
    relativeTime: formatRelativeTime(source.created_at),
  }
}

export function buildNotificationActivityItem(source: {
  id: string
  type: string
  title: string
  body: string | null
  link_href: string | null
  created_at: string
}): ActivityItem {
  return {
    id: `notification-${source.id}`,
    kind: source.type as ActivityKind,
    title: source.title,
    occurredAt: source.created_at,
    relativeTime: formatRelativeTime(source.created_at),
    payerText: source.body ?? undefined,
    linkHref: source.link_href ?? undefined,
    viewLabel: 'Open',
  }
}
