// app/(main)/layout.tsx

import type { ReactNode } from 'react'

import Topnav from '@/components/layout/Topnav'
import Bottomnav from '@/components/layout/Bottomnav'

export default function MainLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Topnav />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pb-6">
        {children}
      </main>

      <Bottomnav />
    </div>
  )
}