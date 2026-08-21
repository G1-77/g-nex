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
      ? 'text-yellow-500'
      : rank === 2
        ? 'text-slate-300'
        : rank === 3
          ? 'text-amber-600'
          : 'text-slate-600'

  return (
    <Link
      href={`/user/${trader.username}`}
      className="group flex items-start gap-2.5"
    >
      <span
        className={`mt-1 w-4 shrink-0 text-center font-mono text-[10px] font-black ${rankColor}`}
      >
        {rank}
      </span>

      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-800">
        {trader.avatar_url ? (
          <Image
            src={trader.avatar_url}
            alt={`@${trader.username}`}
            fill
            sizes="36px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-slate-900 text-[10px] font-black text-slate-300">
            {initialsOf(trader.username)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-xs font-bold text-slate-200 transition-colors group-hover:text-white">
              @{trader.username}
            </span>
            {trader.is_verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-yellow-600 stroke-slate-950" />
            )}
          </span>

          <span className="shrink-0 rounded-md border border-emerald-500/10 bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
            {formatRoi(trader.monthly_roi)}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[10px] text-slate-500">30d ROI</span>

          {typeof trader.realized_kes === 'number' && (
            <span className="shrink-0 font-mono text-[10px] text-slate-500">
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
    <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4 backdrop-blur-md">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Top Traders
      </h2>

      {isLoading ? (
        <div className="space-y-3.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-900/40" />
          ))}
        </div>
      ) : !traders || traders.length === 0 ? (
        <p className="font-mono text-[11px] text-slate-500">
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
