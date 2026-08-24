'use client'

// components/home/HomeWalletSnapshot.tsx
// Concise Home wallet summary — every value comes from the authoritative
// usePortfolioSummary pipeline (wallet row + holdings valued off the shared
// market cache). Nothing is recomputed or invented here.

import Link from 'next/link'
import { ArrowDownToLine, Wallet } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import { usePortfolioSummary } from '@/lib/react-query/market/queries.market'
import { formatKes, formatUsd } from '@/lib/market/wallet-utils'

export default function HomeWalletSnapshot() {
  const { user, isLoading } = useAuth()
  const summary = usePortfolioSummary(user?.id ?? null)

  if (!isLoading && !user) {
    return (
      <section aria-label="Your portfolio">
        <div className="gnex-card flex items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-bg">
              <Wallet className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-body-sm font-bold text-text-primary">Your portfolio</p>
              <p className="text-caption text-text-muted">Sign in to see your money at a glance</p>
            </div>
          </div>
          <Link
            href="/login"
            className="gnex-btn gnex-btn-primary shrink-0 px-4 py-2 text-caption"
          >
            Sign in
          </Link>
        </div>
      </section>
    )
  }

  const growth = summary.growthPct

  return (
    <section aria-label="Your portfolio">
      <div className="gnex-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
              Estimated total value
            </p>
            <p className="mt-1 font-mono text-mono-xl font-black tabular-nums text-text-primary">
              KES {formatKes(summary.totalKes)}
            </p>
            <p className="mt-1 font-mono text-caption text-text-muted">
              ≈ {formatUsd(summary.totalUsd)}
              {growth !== null && (
                <span className={growth >= 0 ? 'ml-2 text-success' : 'ml-2 text-danger'}>
                  {growth >= 0 ? '+' : ''}
                  {growth.toFixed(2)}% holdings growth
                </span>
              )}
            </p>
          </div>

          <Link
            href="/wallet/deposit"
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2.5 text-caption font-bold text-text-inverse shadow-sm shadow-brand/20 transition-colors hover:bg-brand/90 active:scale-[0.98]"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Add Funds
          </Link>
        </div>

        <Link
          href="/wallet"
          className="mt-3 inline-flex cursor-pointer items-center gap-1 text-caption font-semibold text-text-secondary transition-colors hover:text-brand"
        >
          Open wallet
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
