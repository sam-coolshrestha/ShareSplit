import type { Metadata } from 'next'
import { Anton, Hanken_Grotesk, Plus_Jakarta_Sans, Space_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/lib/hooks/useTheme'

import './globals.css'

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'ShareSplit',
  description: 'Free, fast expense splitting with UPI support',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="comic" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('sharesplit-theme');document.documentElement.dataset.theme=t==='modern'?'modern':'comic'}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${anton.variable} ${hankenGrotesk.variable} ${spaceMono.variable} ${plusJakartaSans.variable}`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
