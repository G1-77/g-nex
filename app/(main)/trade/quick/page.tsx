'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QuickTradePanel from '@/components/trade/QuickTradePanel'

export default function QuickTradePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-12">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/trade"
          className="rounded-full border border-slate-800 p-2 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          aria-label="Back to trade hub"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-slate-100">Quick Trade</h1>
          <p className="text-xs text-slate-500">Instant market execution · KES settlement</p>
        </div>
      </div>

      <QuickTradePanel />
    </div>
  )
}
