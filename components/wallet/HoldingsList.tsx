'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatKes, formatUnits } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'

export interface HoldingRowData {
  symbol: AssetSymbol
  name: string
  logo: string
  units: number
  valueKes: number
  change24h: number
}

interface HoldingsListProps {
  rows: HoldingRowData[]
  loading?: boolean
}

export default function HoldingsList({ rows, loading }: HoldingsListProps) {
  const held = rows.filter((r) => r.units > 0)
  const zero = rows.filter((r) => r.units === 0)

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-900/40" />
        ))}
      </div>
    )
  }

  if (held.length === 0) {
    return (
      <section className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-5 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Your savings
        </p>
        <p className="mt-3 text-sm text-slate-400">
          You don&apos;t own any assets yet.
        </p>
        <Link
          href="/markets"
          className="mt-4 inline-block rounded-xl border border-yellow-600/30 bg-yellow-600/10 px-4 py-2.5 text-xs font-bold text-yellow-600 transition-colors hover:bg-yellow-600/20"
        >
          Browse markets to start
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Your savings
        </p>
        <p className="font-mono text-[10px] text-slate-600">by value</p>
      </div>

      <ul className="mt-3 divide-y divide-slate-900/60">
        {held.map((row) => (
          <li key={row.symbol}>
            <Link
              href={`/markets/${row.symbol.toLowerCase()}`}
              className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-900/30"
            >
              <Image src={row.logo} alt={row.name} width={36} height={36} className="h-9 w-9 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-200">{row.name}</p>
                <p className="font-mono text-[10px] text-slate-500">
                  {formatUnits(row.symbol, row.units)} {row.symbol}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-[12px] font-bold text-slate-200">
                  KES {formatKes(row.valueKes)}
                </p>
                <p
                  className={`font-mono text-[10px] font-bold ${
                    row.change24h >= 0 ? 'text-[#8DFF45]' : 'text-[#FF5A5A]'
                  }`}
                >
                  {row.change24h >= 0 ? '+' : ''}
                  {row.change24h.toFixed(2)}%
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {zero.length > 0 && (
        <ul className="mt-1 space-y-1">
          {zero.map((row) => (
            <li key={row.symbol}>
              <Link
                href={`/markets/${row.symbol.toLowerCase()}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-50 transition-all hover:bg-slate-900/40 hover:opacity-100"
              >
                <Image src={row.logo} alt={row.name} width={28} height={28} className="h-7 w-7 shrink-0 grayscale" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-400">{row.name}</span>
                <span className="text-[10px] font-semibold text-yellow-600">Start buying</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}