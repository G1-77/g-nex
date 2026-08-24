'use client'

// components/home/HomeMarketSnapshot.tsx
// Compact market-awareness preview — NOT the Markets page. Category tabs, five
// visible rows from the shared price pipeline, See More → /markets. Prices,
// 24h changes and KES conversion all come from the authoritative market cache
// (GET /api/market/prices + useUsdKesRate) — no Home-only data source.

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { setFocusedAsset } from '@/lib/store/focused-asset'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useUsdKesRate } from '@/lib/react-query/market/queries.market'
import { formatKes } from '@/lib/market/wallet-utils'
import type { MarketFilterType } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

const TABS: { id: MarketFilterType; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'Gold', label: 'Gold' },
  { id: 'Watchlist', label: 'Watchlist' },
]

const VISIBLE_ROWS = 5

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

function formatKesPrice(kes: number): string {
  if (kes >= 1000) return `KES ${formatKes(Math.round(kes))}`
  if (kes >= 1) return `KES ${kes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `KES ${kes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export default function HomeMarketSnapshot() {
  const router = useRouter()
  const [tab, setTab] = useState<MarketFilterType>('Crypto')
  const { data: tickers = [], isLoading } = useMarketPrices()
  const { data: usdKesRate } = useUsdKesRate()

  const rows = useMemo(() => {
    const filtered = tickers.filter((ticker) => {
      if (tab === 'Crypto') return ticker.symbol !== 'XAU' && ticker.symbol !== 'USDT' && ticker.symbol !== 'USDC'
      if (tab === 'Gold') return ticker.symbol === 'XAU'
      if (tab === 'Watchlist') return ticker.isWatching
      // Stablecoins are not market-movement rows — hide them from All too.
      return ticker.symbol !== 'USDT' && ticker.symbol !== 'USDC'
    })
    // Keep a stable, deterministic order rather than provider arrival order.
    return [...filtered].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0)).slice(0, VISIBLE_ROWS)
  }, [tickers, tab])

  const openAsset = (symbol: AssetSymbol) => {
    setFocusedAsset(symbol)
    router.push(`/markets/${symbol.toLowerCase()}`)
  }

  return (
    <section aria-label="Market snapshot" className="gnex-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="gnex-h3 text-text-primary">Markets</h2>
        <Link
          href="/markets"
          className="flex cursor-pointer items-center gap-0.5 rounded-md px-2 py-1 text-caption font-bold text-brand transition-colors hover:bg-brand-bg active:scale-[0.98]"
        >
          See More
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Category tabs */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Market categories">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-caption font-bold tracking-wide transition-all active:scale-95 ${
              tab === id
                ? 'bg-brand text-text-inverse shadow-sm shadow-brand/10'
                : 'bg-surface/60 text-text-muted hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Column header */}
      {!isLoading && rows.length > 0 && (
        <div className="mt-3 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
          <span>Name</span>
          <span>Last price · 24h</span>
        </div>
      )}

      {/* Rows */}
      {isLoading ? (
        <div className="mt-2 space-y-2">
          {[...Array(VISIBLE_ROWS)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-hover" aria-hidden="true" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-3 rounded-xl bg-surface/40 p-5 text-center">
          <p className="text-body-sm text-text-secondary">
            {tab === 'Watchlist' ? 'Star assets to build your watchlist.' : 'No assets to show yet.'}
          </p>
          {tab === 'Watchlist' && (
            <Link
              href="/markets"
              className="mt-3 inline-flex cursor-pointer items-center rounded-lg bg-brand-bg px-3 py-1.5 text-caption font-bold text-brand transition-colors hover:bg-brand-border"
            >
              Explore markets
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {rows.map((ticker) => {
            const positive = ticker.change24h >= 0
            return (
              <li key={ticker.symbol}>
                <button
                  type="button"
                  onClick={() => openAsset(ticker.symbol)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-surface-hover active:bg-surface-active"
                  aria-label={`${ticker.name} last price ${formatPrice(ticker.priceUsd)} dollars, 24h change ${ticker.change24h.toFixed(2)} percent`}
                >
                  <Image src={ticker.logo} alt="" width={32} height={32} className="h-8 w-8 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold text-text-primary">{ticker.name}</p>
                    <p className="truncate font-mono text-caption uppercase text-text-muted">{ticker.symbol}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-body-sm font-bold tabular-nums text-text-primary">
                      ${formatPrice(ticker.priceUsd)}
                    </p>
                    {usdKesRate !== undefined && (
                      <p className="truncate font-mono text-[10px] tabular-nums text-text-muted">
                        {formatKesPrice(ticker.priceUsd * usdKesRate)}
                      </p>
                    )}
                  </div>

                  <span
                    className={`w-[68px] shrink-0 rounded-md px-1.5 py-1 text-right font-mono text-caption font-black tabular-nums ${
                      positive ? 'text-success' : 'text-danger'
                    }`}
                    style={{ backgroundColor: positive ? 'var(--success-bg)' : 'var(--danger-bg)' }}
                  >
                    {positive ? '+' : ''}
                    {ticker.change24h.toFixed(2)}%
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
