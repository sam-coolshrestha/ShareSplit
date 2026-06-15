import type { HTMLAttributes } from 'react'

import { cn } from './utils'

export type BadgeVariant = 'default' | 'primary' | 'success' | 'error'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-raised text-foreground',
  primary: 'bg-primary text-ink',
  success: 'bg-success text-ink',
  error: 'bg-error text-ink',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'theme-chip inline-flex items-center px-2.5 py-1 font-mono text-[0.6875rem] font-bold uppercase tracking-wider',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}
