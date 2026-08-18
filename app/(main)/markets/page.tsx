'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import ExploreNavTiles, {
  type ExploreNavTarget,
} from '@/components/market/ExploreNavTiles'
import ExploreFilterTrack from '@/components/market/ExploreFilterTrack'
import AssetSparklineCard from '@/components/market/AssetSparklineCard'
import TopStories from '@/components/market/TopStories'
import IdeasCarousel from '@/components/market/IdeasCarousel'
import EconomicCalendar from '@/components/market/EconomicCalendar'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import {
  useGetUserWatchlistQuery,
  useToggleWatchlistMutation,
} from '@/lib/react-query/market/queries.market'
import { useAuth } from '@/components/providers/AuthProvider'
import { setFocusedAsset } from '@/lib/store/focused-asset'
import type { MarketFilterType } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

function scrollToSection(ref: React.RefObject<HTMLDivElement | null>) {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function MarketsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<MarketFilterType>('All')

  const gridRef = useRef<HTMLDivElement>(null)
  const storiesRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id || null)
  const toggleWatchlist = useToggleWatchlistMutation()
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

  const handleToggleWatchlist = (symbol: AssetSymbol) => {
    if (!user?.id) return
    toggleWatchlist.mutate({ userId: user.id, symbol })
  }

  const handleNavTile = (target: ExploreNavTarget) => {
    if (target === 'news') {
      scrollToSection(storiesRef)
    } else if (target === 'calendar') {
      scrollToSection(calendarRef)
    } else {
      setActiveFilter('Watchlist')
      setTimeout(() => scrollToSection(gridRef), 60)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      {/* MAIN PAGE HEADER */}
      <header className="-mx-4 border-b border-slate-900/60 bg-slate-950/90 px-4 py-5 backdrop-blur-md md:-mx-6 md:px-6">
        <h1 className="text-2xl font-black tracking-wide text-slate-100">Explore</h1>
        <p className="mt-1 text-xs text-slate-500">Markets, news &amp; ideas</p>
      </header>

      <div className="flex-1">
        {/* NAVIGATION TILE ROW */}
        <div className="pt-4">
          <ExploreNavTiles onNavigate={handleNavTile} />
        </div>

        {/* STICKY ASSET FILTER TRACK */}
        <div className="mt-4">
          <ExploreFilterTrack
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        {/* ASSET OVERVIEW GRID */}
        <div ref={gridRef} className="scroll-mt-16 pt-4">
          {isLoading && filteredTickers.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-slate-900/60 bg-slate-900/20"
                />
              ))}
            </div>
          ) : filteredTickers.length === 0 ? (
            <div className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-6 text-center">
              <p className="font-mono text-xs text-slate-500">
                Star assets to build your watchlist.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {filteredTickers.map((ticker) => (
                <AssetSparklineCard
                  key={ticker.symbol}
                  ticker={ticker}
                  onOpen={handleOpenAsset}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              ))}
            </div>
          )}
        </div>

        {/* BOLD TEXT NEWS STREAM */}
        <div ref={storiesRef} className="scroll-mt-16 pt-8">
          <TopStories />
        </div>

        {/* COMMUNITY IDEAS SLIDER */}
        <div className="pt-8">
          <IdeasCarousel tickers={liveTickers} />
        </div>

        {/* STACKED ECONOMIC CALENDAR AGENDA */}
        <div ref={calendarRef} className="scroll-mt-16 pt-8">
          <EconomicCalendar />
        </div>
      </div>
    </div>
  )
}