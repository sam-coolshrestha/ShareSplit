import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

import { cn } from './utils'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  priority?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, priority = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(priority ? 'theme-card-priority' : 'theme-card', 'p-5', className)}
      {...props}
    />
  )
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4 space-y-1', className)} {...props} />
  )
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-display text-2xl text-foreground', className)} {...props} />
  )
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm leading-6 text-muted-light', className)} {...props} />
  )
)

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />
)

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-5 flex items-center gap-3', className)} {...props} />
  )
)

CardFooter.displayName = 'CardFooter'
