'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'

import MarketFilterChips from '@/components/market/MarketFilterChips'
import AssetRow from '@/components/market/AssetRow'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useGetUserWatchlistQuery } from '@/lib/react-query/market/queries.market'
import { useAuth } from '@/components/providers/AuthProvider'
import { setFocusedAsset } from '@/lib/store/focused-asset'
import type { MarketFilterType } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

export default function MarketsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<MarketFilterType>('All')

  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id || null)
  const { data: liveTickers = [], isLoading } = useMarketPrices(watchlistSymbols)

  const filteredTickers = liveTickers.filter((ticker) => {
    if (activeFilter === 'Crypto') return ticker.symbol !== 'XAU' && ticker.symbol !== 'USDT'
    if (activeFilter === 'Gold') return ticker.symbol === 'XAU'
    if (activeFilter === 'Watchlist') return ticker.isWatching
    return true
  })

  const handleOpenAsset = (symbol: AssetSymbol) => {
    setFocusedAsset(symbol)
    router.push(`/markets/${symbol.toLowerCase()}`)
  }

  if (isLoading && liveTickers.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-amber-500" />
          <p className="font-mono text-sm text-slate-500">Loading market data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      {/* TOP HEADER NAVIGATION */}
      <header className="-mx-4 flex items-center justify-between border-b border-slate-900/60 bg-slate-950/90 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6">
        <h1 className="text-xl font-black tracking-wide text-slate-100">Markets</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search markets"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <Search className="h-4 w-4 text-slate-400" />
          </button>
          <button
            type="button"
            aria-label="Filter markets"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </header>

      {/* SEGMENTED FILTER ROW */}
      <div className="-mx-4 border-b border-slate-900/60 px-4 md:-mx-6 md:px-6">
        <MarketFilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>

      {/* MARKET ASSET TABLE */}
      <div className="flex-1 py-4">
        {filteredTickers.length === 0 ? (
          <div className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-6 text-center">
            <p className="font-mono text-xs text-slate-500">No assets in this view yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-900/60 bg-slate-900/20">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-slate-900/60 px-4 py-2.5">
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                Asset
              </span>
              <span className="w-16 text-center font-mono text-[9px] uppercase tracking-widest text-slate-500">
                Trend
              </span>
              <span className="text-right font-mono text-[9px] uppercase tracking-widest text-slate-500">
                Price
              </span>
              <span className="w-14 text-right font-mono text-[9px] uppercase tracking-widest text-slate-500">
                24h
              </span>
            </div>

            {filteredTickers.map((ticker) => (
              <AssetRow key={ticker.symbol} ticker={ticker} onOpen={handleOpenAsset} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
