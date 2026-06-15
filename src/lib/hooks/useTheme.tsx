'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'comic' | 'modern'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
}

const STORAGE_KEY = 'sharesplit-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('comic')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY)
    const initialTheme: Theme = savedTheme === 'modern' ? 'modern' : 'comic'

    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme: Theme = currentTheme === 'comic' ? 'modern' : 'comic'

      window.localStorage.setItem(STORAGE_KEY, nextTheme)
      applyTheme(nextTheme)

      return nextTheme
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
