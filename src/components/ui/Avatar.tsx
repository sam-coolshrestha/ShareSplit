import type { HTMLAttributes, ImgHTMLAttributes } from 'react'

import { cn } from './utils'

export type AvatarSize = 'sm' | 'md' | 'lg'

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  src?: string | null
  alt: string
  fallback?: string
  size?: AvatarSize
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  imageProps,
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        'theme-avatar grid shrink-0 place-items-center overflow-hidden font-mono font-bold uppercase text-foreground',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className={cn('h-full w-full object-cover', imageProps?.className)} {...imageProps} />
      ) : (
        <span aria-label={alt}>{getInitials(fallback ?? alt)}</span>
      )}
    </div>
  )
}
