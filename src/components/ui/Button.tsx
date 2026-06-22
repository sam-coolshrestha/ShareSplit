import { Children, cloneElement, forwardRef, isValidElement } from 'react'
import type { ButtonHTMLAttributes, ReactElement } from 'react'

import { cn } from './utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'theme-button bg-primary text-ink hover:bg-primary-hover',
  secondary:
    'theme-button bg-surface-raised text-foreground hover:bg-surface-high',
  ghost: 'border-[length:var(--border-width)] border-transparent bg-transparent text-foreground hover:bg-surface',
  danger: 'theme-button bg-error text-ink hover:bg-error',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-13 px-7 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      asChild = false,
      type = 'button',
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      'inline-flex items-center justify-center gap-2 rounded-md font-mono font-bold uppercase tracking-wider transition disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className
    )

    if (asChild) {
      const child = Children.only(children) as ReactElement<{ className?: string }>

      if (!isValidElement(child)) {
        return null
      }

      return cloneElement(child, {
        ...props,
        className: cn(classes, child.props.className),
      })
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
