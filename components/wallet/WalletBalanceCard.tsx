'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowDownLeft, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react'
import PerformanceArea, { type PerformancePoint } from './PerformanceArea'
import { allocationColor, formatKes, formatUsd } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'

const KE_INFLATION = 5.1

export interface AllocationSlice {
  symbol: AssetSymbol
  name: string
  logo: string
  valueKes: number
  pct: number
}

interface WalletBalanceCardProps {
  totalKes: number
  totalUsd: number
  cashKes: number
  lockedKes: number
  reserveKes: number
  growthPct: number | null
  usdKes: number
  allocation: AllocationSlice[]
  performanceSeries?: PerformancePoint[]
  demoFunding?: boolean
  onDemoFund?: () => void
}

function GrowthBadge({ growthPct, hasInvested }: { growthPct: number | null; hasInvested: boolean }) {
  if (!hasInvested) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/40 px-2.5 py-1 text-caption font-semibold text-text-muted">
        <TrendingUp className="h-3 w-3" />
        Start saving to beat KE inflation {KE_INFLATION}%
      </span>
    )
  }

  if (growthPct === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/40 px-2.5 py-1 text-caption font-semibold text-text-muted">
        <TrendingUp className="h-3 w-3" />
        Portfolio tracking · vs KE inflation {KE_INFLATION}%
      </span>
    )
  }

  const ahead = growthPct >= KE_INFLATION
  const beating = growthPct >= 0
  const color = ahead ? 'text-success bg-success-bg' : beating ? 'text-warning bg-warning-bg' : 'text-danger bg-danger-bg'
  const verb = ahead ? "You're ahead" : beating ? 'Beating inflation' : 'Below inflation'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-caption font-bold ${color}`}>
      <TrendingUp className="h-3 w-3" />
      {growthPct >= 0 ? '+' : ''}
      {growthPct.toFixed(1)}% vs KE inflation {KE_INFLATION}% · {verb}
    </span>
  )
}

function AllocationDonut({ allocation }: { allocation: AllocationSlice[] }) {
  const total = allocation.reduce((acc, a) => acc + a.valueKes, 0)
  if (total <= 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-surface/20 text-center text-caption text-text-muted">
        Buy a first asset to see your
        <br />
        savings split at a glance
      </div>
    )
  }

  const r = 36
  const c = 2 * Math.PI * r
  const segments = allocation.reduce<
    Array<AllocationSlice & { dash: number; offset: number }>
  >((list, slice) => {
    const prev = list[list.length - 1]
    const acc = prev ? -prev.offset / c : 0
    const frac = slice.valueKes / total
    return [...list, { ...slice, dash: frac * c, offset: -acc * c }]
  }, [])

  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-slate-800)" strokeWidth="10" />
      {segments.map((seg) => (
        <circle
          key={seg.symbol}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={allocationColor(seg.symbol)}
          strokeWidth="10"
          strokeDasharray={`${seg.dash} ${c}`}
          strokeDashoffset={seg.offset}
          transform="rotate(-90 50 50)"
        />
      ))}
      <text x="50" y="47" textAnchor="middle" fill="var(--color-text-primary)" fontSize="10" fontWeight="700" fontFamily="monospace">
        {total.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
      </text>
      <text x="50" y="58" textAnchor="middle" fill="var(--color-text-muted)" fontSize="6" fontWeight="600" fontFamily="monospace">
        KES TOTAL
      </text>
    </svg>
  )
}

export default function WalletBalanceCard({
  totalKes,
  totalUsd,
  cashKes,
  lockedKes,
  reserveKes,
  growthPct,
  usdKes,
  allocation,
  performanceSeries,
  demoFunding,
  onDemoFund,
}: WalletBalanceCardProps) {
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES')
  const hasInvested = allocation.some((a) => a.valueKes > 0)
  const allocationSegments = allocation.filter((a) => a.valueKes > 0)

  return (
    <section className="gnex-card p-6 space-y-6">
      {/* HEADLINE */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
            Total savings
          </p>
          <p className="mt-1.5 font-mono text-3xl font-black tabular-nums text-text-primary">
            {currency === 'KES' ? `KES ${formatKes(totalKes)}` : formatUsd(totalUsd)}
          </p>
          <p className="mt-1 font-mono text-caption text-text-muted">
            {currency === 'KES'
              ? `≈ ${formatUsd(totalUsd)} · Rate ${formatKes(usdKes)}`
              : `≈ KES ${formatKes(totalKes)} · Rate ${formatKes(usdKes)}`}
          </p>
        </div>

        {/* CURRENCY TOGGLE */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface/40 p-0.5">
          {(['KES', 'USD'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-full px-2.5 py-1 font-mono text-caption font-bold transition-colors ${
                currency === c
                  ? 'bg-brand text-text-inverse'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* GROWTH BADGE */}
      <div>
        <GrowthBadge growthPct={growthPct} hasInvested={hasInvested} />
      </div>

      {/* SAVINGS SPLIT */}
      <div className="flex items-center gap-5">
        <AllocationDonut allocation={allocation} />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
            Your savings at a glance
          </p>
          {allocationSegments.length === 0 ? (
            <p className="text-body-sm leading-relaxed text-text-muted">
              Cash-only for now. Add a first holding to start your savings split.
            </p>
          ) : (
            <ul className="space-y-2">
              {allocationSegments.slice(0, 5).map((slice) => (
                <li key={slice.symbol}>
                  <Link
                    href={`/markets/${slice.symbol.toLowerCase()}`}
                    className="group flex items-center gap-2.5 rounded-md py-1 transition-colors hover:bg-surface-hover"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: allocationColor(slice.symbol) }}
                    />
                    <Image
                      src={slice.logo}
                      alt={slice.name}
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text-secondary group-hover:text-text-primary">
                      {slice.name}
                    </span>
                    <span className="font-mono text-caption font-bold text-text-secondary">
                      {slice.pct.toFixed(0)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* PERFORMANCE */}
      <div className="gnex-card-elevated p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
            Performance · This month
          </p>
          <p className="font-mono text-body-sm font-bold text-success">
            {growthPct === null ? '—' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
          </p>
        </div>
        <div className="mt-3">
          <PerformanceArea endValue={Math.max(1, totalKes)} data={performanceSeries} seed="gnex-wallet" />
        </div>
      </div>

      {/* BALANCE BREAKDOWN */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-surface/40 px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Cash</p>
          <p className="mt-1 font-mono text-xs font-bold text-text-primary">{formatKes(cashKes)}</p>
        </div>
        <div className="rounded-lg bg-warning-bg px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-warning/70">Locked</p>
          <p className="mt-1 font-mono text-xs font-bold text-warning">{formatKes(lockedKes)}</p>
        </div>
        <div className="rounded-lg bg-surface/40 px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Reserve</p>
          <p className="mt-1 font-mono text-xs font-bold text-text-muted">{formatKes(reserveKes)}</p>
        </div>
        <div className="rounded-lg bg-success-bg px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-success/70">Buying power</p>
          <p className="mt-1 font-mono text-xs font-bold text-success">{formatUsd(cashKes / usdKes)}</p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/wallet/deposit"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-text-inverse transition-colors hover:bg-brand/90 gnex-touch-target"
        >
          <ArrowDownLeft className="h-4 w-4" />
          Deposit
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex items-center justify-center gap-2 rounded-xl bg-surface/40 px-4 py-3 text-sm font-bold text-text-primary transition-colors hover:bg-surface-hover gnex-touch-target"
        >
          <ArrowUpRight className="h-4 w-4" />
          Withdraw
        </Link>
      </div>

      {onDemoFund && (
        <button
          type="button"
          onClick={onDemoFund}
          disabled={demoFunding}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-surface/40 px-4 py-2.5 text-caption font-semibold text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-60 gnex-touch-target"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          {demoFunding ? 'Funding…' : 'Instant demo fund KES 100,000 + demo holdings'}
        </button>
      )}
    </section>
  )
}