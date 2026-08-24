'use client'

// components/home/HomeWalletSnapshot.tsx
// Financial-dashboard wallet card (Binance-style IA, GNEX slate language):
//   Estimated Total Value → KES headline + ≈USD
//   24h PNL + 24h PNL% with direction treatment
//   compact sparkline of REAL portfolio value movement (hourly closes)
// Every number comes from the authoritative pipelines (usePortfolioSummary,
// usePortfolioPnl24h, usePortfolioValueSeries). Nothing is invented here; when
// real history is unavailable the chart hides instead of drawing a fake line.

import Link from 'next/link'
import { ArrowDownToLine, Wallet } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import { usePortfolioSummary } from '@/lib/react-query/market/queries.market'
import {
  usePortfolioPnl24h,
  usePortfolioValueSeries,
} from '@/lib/react-query/market/queries.portfolio-history'
import { formatKes, formatUsd } from '@/lib/market/wallet-utils'
import SparklineArea from '@/components/market/SparklineArea'

const SUCCESS_COLOR = '#8DFF45'
const DANGER_COLOR = '#FF5A5A'

function formatSignedKes(value: number): string {
  const abs = Math.abs(value)
  return `${value >= 0 ? '+' : '-'}KES ${formatKes(abs)}`
}

function WalletSparkline({ series, positive }: { series: number[] | null; positive: boolean }) {
  if (!series || series.length < 2) return null
  return (
    <div className="h-12 w-28 shrink-0 sm:h-14 sm:w-40" aria-hidden="true">
      <SparklineArea
        data={series}
        color={positive ? SUCCESS_COLOR : DANGER_COLOR}
        height={56}
        className="h-full w-full"
      />
    </div>
  )
}

export default function HomeWalletSnapshot() {
  const { user, isLoading } = useAuth()
  const summary = usePortfolioSummary(user?.id ?? null)
  const pnl = usePortfolioPnl24h(user?.id ?? null)
  const series = usePortfolioValueSeries(user?.id ?? null)

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

  const pnlPositive = (pnl.pnlKes ?? 0) >= 0
  const pnlColor = pnlPositive ? 'text-success' : 'text-danger'

  return (
    <section aria-label="Your portfolio">
      <div className="gnex-card-elevated p-5">
        {/* Headline position */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
              Estimated total value
            </p>
            <p className="mt-1 truncate font-mono text-mono-xl font-black tabular-nums text-text-primary">
              KES {formatKes(summary.totalKes)}
            </p>
            <p className="mt-1 truncate font-mono text-caption text-text-muted">
              ≈ {formatUsd(summary.totalUsd)}
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

        {/* 24h performance strip — dashboard treatment */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border-subtle pt-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted">24h PNL</p>
            <p className={`mt-0.5 font-mono text-mono-lg font-bold tabular-nums ${pnlColor}`}>
              {pnl.pnlKes !== null ? formatSignedKes(pnl.pnlKes) : '—'}
            </p>
            <p className={`mt-0.5 font-mono text-caption font-semibold tabular-nums ${pnlColor}`}>
              {pnl.pnlPct !== null
                ? `${pnlPositive ? '+' : ''}${pnl.pnlPct.toFixed(2)}%`
                : ''}
              {pnl.pnlPct !== null && (
                <span className="ml-1.5 font-sans font-normal text-text-muted">past 24 hours</span>
              )}
            </p>
          </div>

          <WalletSparkline series={series} positive={pnlPositive} />
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
