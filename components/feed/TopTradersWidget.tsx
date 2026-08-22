'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { useTopTraders, type TopTrader } from '@/lib/react-query/queries/traders.queries'

function initialsOf(username: string): string {
  return username.replace(/^@/, '').slice(0, 2).toUpperCase()
}

function formatRoi(roi: number): string {
  return `${roi > 0 ? '+' : ''}${roi.toFixed(2)}%`
}

function TraderRow({ trader, rank }: { trader: TopTrader; rank: number }) {
  const rankColor =
    rank === 1
      ? 'text-amber-400'
      : rank === 2
        ? 'text-slate-300'
        : rank === 3
          ? 'text-amber-600'
          : 'text-text-muted'

  return (
    <Link
      href={`/user/${trader.username}`}
      className="group flex items-start gap-2.5"
    >
      <span
        className={`mt-1 w-5 shrink-0 text-center font-mono text-caption font-black ${rankColor}`}
      >
        {rank}
      </span>

      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
        {trader.avatar_url ? (
          <Image
            src={trader.avatar_url}
            alt={`@${trader.username}`}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-surface text-caption font-black text-text-secondary">
            {initialsOf(trader.username)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-bold text-text-primary transition-colors group-hover:text-brand">
              @{trader.username}
            </span>
            {trader.is_verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 fill-brand stroke-background" aria-label="Verified" />
            )}
          </span>

          <span className="shrink-0 rounded-md border border-success-border bg-success-bg px-1.5 py-0.5 text-caption font-bold text-success">
            {formatRoi(trader.monthly_roi)}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-caption text-text-muted">30d ROI</span>

          {typeof trader.realized_kes === 'number' && (
            <span className="shrink-0 font-mono text-caption text-text-muted">
              {trader.realized_kes >= 0 ? '+' : ''}
              {trader.realized_kes.toLocaleString(undefined, { maximumFractionDigits: 0 })} KES
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function TopTradersWidget() {
  const { data: traders, isLoading } = useTopTraders(5)

  return (
    <div className="gnex-card p-4">
      <h2 className="mb-4 text-caption font-bold uppercase tracking-wider text-text-muted">
        Top Traders
      </h2>

      {isLoading ? (
        <div className="space-y-3.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-surface/40" />
          ))}
        </div>
      ) : !traders || traders.length === 0 ? (
        <p className="font-mono text-caption text-text-muted">
          No ranked traders yet — ROI updates daily.
        </p>
      ) : (
        <div className="space-y-3.5">
          {traders.map((trader, i) => (
            <TraderRow key={trader.id} trader={trader} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
