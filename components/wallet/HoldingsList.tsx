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
          <div key={i} className="h-16 rounded-xl bg-surface/40" />
        ))}
      </div>
    )
  }

  if (held.length === 0) {
    return (
      <section className="gnex-card p-5 text-center">
        <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
          Your savings
        </p>
        <p className="mt-3 text-body-sm text-text-muted">
          You don&apos;t own any assets yet.
        </p>
        <Link
          href="/markets"
          className="mt-4 inline-block rounded-xl bg-brand-bg px-4 py-2.5 text-caption font-bold text-brand transition-colors hover:bg-brand-bg/20"
        >
          Browse markets to start
        </Link>
      </section>
    )
  }

  return (
    <section className="gnex-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
          Your savings
        </p>
        <p className="font-mono text-caption text-text-faint">by value</p>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {held.map((row) => (
          <li key={row.symbol}>
            <Link
              href={`/markets/${row.symbol.toLowerCase()}`}
              className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-hover"
            >
              <Image src={row.logo} alt={row.name} width={36} height={36} className="h-9 w-9 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-text-primary">{row.name}</p>
                <p className="font-mono text-caption text-text-muted">
                  {formatUnits(row.symbol, row.units)} {row.symbol}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-body-sm font-bold text-text-primary">
                  KES {formatKes(row.valueKes)}
                </p>
                <p
                  className={`font-mono text-caption font-bold ${
                    row.change24h >= 0 ? 'text-success' : 'text-danger'
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
                className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-50 transition-all hover:bg-surface-hover hover:opacity-100"
              >
                <Image src={row.logo} alt={row.name} width={28} height={28} className="h-7 w-7 shrink-0 grayscale" />
                <span className="min-w-0 flex-1 truncate text-body-sm text-text-muted">{row.name}</span>
                <span className="text-caption font-semibold text-brand">Start buying</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}