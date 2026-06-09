import './styles.css'
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const jetmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: 'ShareSplit',
  description: 'Expense splitting with UPI support',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head />
      <body className={`${inter.variable} ${playfair.variable} ${jetmono.variable}`}>
        {children}
      </body>
    </html>
  )
}
