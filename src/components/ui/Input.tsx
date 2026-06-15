import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from './utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: ReactNode
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, label, hint, error, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const messageId = `${inputId}-message`

    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : ariaDescribedBy}
          className={cn(
            'theme-input h-11 w-full px-3 text-sm placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error focus:border-error',
            className
          )}
          {...props}
        />

        {error || hint ? (
          <p id={messageId} className={cn('mt-2 text-xs', error ? 'text-error' : 'text-muted-light')}>
            {error ?? hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
