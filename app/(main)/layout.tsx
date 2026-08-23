// app/(main)/layout.tsx

import type { ReactNode } from 'react'

import Topnav from '@/components/layout/Topnav'
import Bottomnav from '@/components/layout/Bottomnav'
import Sidebar from '@/components/layout/Sidebar'

export default function MainLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topnav />

      {/* Shell row — permanent desktop sidebar (lg+) + primary workspace.
          The center column keeps the strongest hierarchy (brief §5). */}
      <div className="mx-auto flex w-full max-w-[1400px] items-start gap-2 md:px-4 lg:gap-6">
        <Sidebar />

        <main className="min-w-0 flex-1 px-page pb-24 pt-4 md:px-0 md:pb-6">
          {children}
        </main>
      </div>

      <Bottomnav />
    </div>
  )
}
