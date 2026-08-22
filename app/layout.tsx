// app/layout.tsx

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

import { AuthProvider } from '@/components/providers/AuthProvider'
import ReactQueryProvider from '@/components/providers/ReactQueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'GNEX',
  description: 'Trade Gold. Trade Crypto. Trade Smart.'
}

// Runs synchronously before first paint: applies the stored preference
// ("light" | "dark" | "system") to <html> so the wrong theme never flashes.
// MUST stay in lockstep with components/providers/ThemeProvider.tsx.
const themeNoFlashScript = `(function(){try{var t=localStorage.getItem('gnex-theme');if(t!=='light'&&t!=='dark')t='system';var d=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:t==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})()`

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
        <ThemeProvider>
          <ReactQueryProvider>

            <AuthProvider>
              {children}
            </AuthProvider>

          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}