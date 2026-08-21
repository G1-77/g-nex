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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
        <TrendingUp className="h-3 w-3" />
        Start saving to beat KE inflation {KE_INFLATION}%
      </span>
    )
  }

  if (growthPct === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
        <TrendingUp className="h-3 w-3" />
        Portfolio tracking · vs KE inflation {KE_INFLATION}%
      </span>
    )
  }

  const ahead = growthPct >= KE_INFLATION
  const beating = growthPct >= 0
  const color = ahead ? 'text-[#8DFF45] border-[#8DFF45]/20 bg-[#8DFF45]/5' : beating ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-rose-400 border-rose-400/20 bg-rose-400/5'
  const verb = ahead ? "You're ahead" : beating ? 'Beating inflation' : 'Below inflation'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${color}`}
    >
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
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center text-[11px] text-slate-500">
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
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
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
      <text x="50" y="47" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700" fontFamily="monospace">
        {total.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
      </text>
      <text x="50" y="58" textAnchor="middle" fill="#64748b" fontSize="6" fontWeight="600" fontFamily="monospace">
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
    <section className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-5">
      {/* HEADLINE */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Total savings
          </p>
          <p className="mt-1.5 font-mono text-3xl font-black tabular-nums text-slate-100">
            {currency === 'KES' ? `KES ${formatKes(totalKes)}` : formatUsd(totalUsd)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">
            {currency === 'KES'
              ? `≈ ${formatUsd(totalUsd)} · Rate ${formatKes(usdKes)}`
              : `≈ KES ${formatKes(totalKes)} · Rate ${formatKes(usdKes)}`}
          </p>
        </div>

        {/* CURRENCY TOGGLE */}
        <div className="flex items-center gap-1 rounded-full border border-slate-800/80 bg-slate-950/60 p-0.5">
          {(['KES', 'USD'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold transition-colors ${
                currency === c
                  ? 'bg-yellow-600 text-slate-950'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* GROWTH BADGE */}
      <div className="mt-4">
        <GrowthBadge growthPct={growthPct} hasInvested={hasInvested} />
      </div>

      {/* SAVINGS SPLIT */}
      <div className="mt-5 flex items-center gap-5">
        <AllocationDonut allocation={allocation} />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Your savings at a glance
          </p>
          {allocationSegments.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-slate-500">
              Cash-only for now. Add a first holding to start your savings split.
            </p>
          ) : (
            <ul className="space-y-2">
              {allocationSegments.slice(0, 5).map((slice) => (
                <li key={slice.symbol}>
                  <Link
                    href={`/markets/${slice.symbol.toLowerCase()}`}
                    className="group flex items-center gap-2.5 rounded-md py-0.5 transition-colors hover:bg-slate-900/40"
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
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-300 group-hover:text-slate-100">
                      {slice.name}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-300">
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
      <div className="mt-5 rounded-xl border border-slate-900/60 bg-slate-950/40 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Performance · This month
          </p>
          <p className="font-mono text-[11px] font-bold text-[#8DFF45]">
            {growthPct === null ? '—' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
          </p>
        </div>
        <div className="mt-3">
          <PerformanceArea endValue={Math.max(1, totalKes)} data={performanceSeries} seed="gnex-wallet" />
        </div>
      </div>

      {/* BALANCE BREAKDOWN */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Cash</p>
          <p className="mt-1 font-mono text-xs font-bold text-slate-200">{formatKes(cashKes)}</p>
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-amber-400/70">Locked</p>
          <p className="mt-1 font-mono text-xs font-bold text-amber-400">{formatKes(lockedKes)}</p>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Reserve</p>
          <p className="mt-1 font-mono text-xs font-bold text-slate-500">{formatKes(reserveKes)}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-500/70">Buying power</p>
          <p className="mt-1 font-mono text-xs font-bold text-emerald-400">{formatUsd(cashKes / usdKes)}</p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/wallet/deposit"
          className="flex items-center justify-center gap-2 rounded-xl bg-yellow-600 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-yellow-500"
        >
          <ArrowDownLeft className="h-4 w-4" />
          Deposit
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900"
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:border-yellow-600/40 hover:text-slate-200 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5 text-yellow-600" />
          {demoFunding ? 'Funding…' : 'Instant demo fund KES 100,000 + demo holdings'}
        </button>
      )}
    </section>
  )
}