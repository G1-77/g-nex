// app/layout.tsx

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

import { AuthProvider } from '@/components/providers/AuthProvider'
import ReactQueryProvider from '@/components/providers/ReactQueryProvider'

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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-slate-950 text-white">
        <ReactQueryProvider>

          <AuthProvider>
            {children}
          </AuthProvider>
          
        </ReactQueryProvider>
      </body>
    </html>
  )
}