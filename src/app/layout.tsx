import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

// Load Inter font with "swap" strategy for performance
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GlowSeller | #1 Dropshipping Automation Tool',
  description: 'Automate your dropshipping business. Find winning products, generate AI listings, and edit photos in seconds.',
  keywords: ['dropshipping', 'automation', 'AI writer', 'background remover', 'product research'],
  openGraph: {
    title: 'GlowSeller - Launch Your Store in 2 Minutes',
    description: 'Stop wasting time on manual work. Automate your sourcing and listings today.',
    type: 'website',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body 
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            inter.variable
          )}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}