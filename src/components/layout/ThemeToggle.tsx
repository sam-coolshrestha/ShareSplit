'use client'

import { motion } from 'framer-motion'

import { useTheme } from '@/lib/hooks/useTheme'

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isModern = theme === 'modern'

  return (
    <div className="flex items-center gap-2">
      {showLabel ? (
        <span className="hidden font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted-light sm:block">
          {isModern ? 'Modern' : 'Comic'}
        </span>
      ) : null}
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
          {isModern ? <ModernIcon /> : <ComicIcon />}
        </motion.span>
      </motion.button>
    </div>
  )
}

function ComicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="m12 2 2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z" />
    </svg>
  )
}

function ModernIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  )
}
