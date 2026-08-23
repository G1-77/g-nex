// components/home/PortfolioAccessCard.tsx
// Low-priority portfolio access on Home (brief §11, §43).
// Compact entry linking to /wallet with balance summary.

'use client'

import Link from 'next/link'
import { Wallet, ChevronRight } from 'lucide-react'
import { usePortfolioSummary } from '@/lib/react-query/market/queries.market'
import { useAuth } from '@/components/providers/AuthProvider'
import { formatKes } from '@/lib/market/wallet-utils'

export default function PortfolioAccessCard() {
    const { user } = useAuth()
    const { totalKes, growthPct } = usePortfolioSummary(user?.id ?? null)

    return (
        <Link
            href="/wallet"
            className="group gnex-card p-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-bg text-brand">
                    <Wallet className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-text-primary">Portfolio</p>
                    <p className="text-body-sm text-text-muted">Holdings, P/L & transaction history</p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span className="text-body font-mono font-bold text-text-primary">
                    KES {formatKes(totalKes)}
                </span>
                {growthPct !== null && (
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-mono font-bold ${
                            growthPct >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                        }`}
                    >
                        {growthPct >= 0 ? '+' : ''}{growthPct.toFixed(1)}%
                    </span>
                )}
                <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-brand transition-colors" />
            </div>
        </Link>
    )
}