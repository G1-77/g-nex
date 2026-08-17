'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Plus } from 'lucide-react'

import MarketSidebar from '@/components/market/MarketSidebar'
import StoriesCarousel from '@/components/market/StoriesCarousel'
import MarketSentimentStrip from '@/components/market/MarketSentimentStrip'
import MarketDataGrid from '@/components/market/MarketDataGrid'
import MarketInsightsRail from '@/components/market/MarketInsightRail'
import AlphaFeedPreview from '@/components/market/AlphaFeedPreview'
import MarketMovers from '@/components/market/MarketMovers'
import VerifiedPositioning from '@/components/market/VerifiedPositioning'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useGetUserWatchlistQuery, useToggleWatchlistMutation } from '@/lib/react-query/market/queries.market'
import { useAuth } from '@/components/providers/AuthProvider'
import { useMarketRealtime } from '@/lib/hooks/useMarketRealtime'
import type { AssetSymbol } from '@/lib/supabase/types'
import { MarketFilterType, MarketTicker, VerifiedTraderAllocation } from '@/lib/supabase/market.types'


const SEED_TRADERS: VerifiedTraderAllocation[] = [
  { id: '1', username: 'alpha_wolf', avatarUrl: '/avatars/1.jpg', monthlyRoi: 42.3, primaryAsset: 'BTC' as AssetSymbol, allocationPercent: 72 },
  { id: '2', username: 'kenyan_trader', avatarUrl: '/avatars/2.jpg', monthlyRoi: 34.8, primaryAsset: 'XAU' as AssetSymbol, allocationPercent: 54 }
]

export default function MarketHomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<MarketFilterType>('All')
  
  // Fetch user's watchlist
  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id || null)
  
  // Fetch live market prices
  const { data: liveTickers = [], isLoading: pricesLoading } = useMarketPrices(watchlistSymbols)
  
  // Watchlist toggle mutation
  const toggleWatchlistMutation = useToggleWatchlistMutation()
  
  // Real-time subscriptions for live updates
  useMarketRealtime(user?.id || null)
  
  const [tickers, setTickers] = useState<MarketTicker[]>(liveTickers)
  
  // Update local state when live data arrives
  useEffect(() => {
    if (liveTickers.length > 0) {
      setTickers(liveTickers)
    }
  }, [liveTickers])

  const handleToggleWatchlist = (symbol: AssetSymbol) => {
    if (!user) {
      alert('Please sign in to manage your watchlist')
      return
    }

    // Optimistic update
    setTickers((prev) =>
      prev.map((item) => item.symbol === symbol ? { ...item, isWatching: !item.isWatching } : item)
    )

    // Execute mutation
    toggleWatchlistMutation.mutate({ userId: user.id, symbol })
  }

  const handleActionClick = (symbol: AssetSymbol, viewMode: 'BUY' | 'SELL' | 'DEPOSIT') => {
    if (viewMode === 'DEPOSIT') {
      alert('Redirecting to local instant payment rails...')
      return
    }
    router.push(`/market/${symbol.toLowerCase()}?mode=${viewMode.toLowerCase()}`)
  }

  // Loading state
  if (pricesLoading && tickers.length === 0) {
    return (
      <div className="h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 border-4 border-slate-800 border-t-yellow-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-mono">Loading market data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden flex flex-col selection:bg-amber-500/30">
      
      {/* 
        THE OVERHAUL MESH:
        Dropped the redundant inline header to let the carousel snap directly beneath your shell topnav.
        Removed harsh side border split lines entirely.
      */}
      <div className="flex-1 w-full flex overflow-hidden">
        
        {/* COLUMN 1: LEFT SIDEBAR NAVIGATION PANEL */}
        <MarketSidebar />

        {/* COLUMN 2: CENTER SCROLLING CANVAS CORE */}
        <div className="flex-1 h-full overflow-y-auto px-4 md:px-6 py-6 space-y-6 flex flex-col w-full scrollbar-none pb-28 lg:pb-12">
          
          {/* SECTION 2 — HERO STORIES CAROUSEL */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] select-none">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span>Live Market Pulse</span>
            </div>
            <StoriesCarousel 
              tickers={tickers} 
              onToggleWatchlist={handleToggleWatchlist} 
              onActionClick={(sym, mode) => handleActionClick(sym, mode)}
            />
          </div>

          {/* SECTION 3 — VISUAL VERTICAL SENTIMENT BAR CHART CLUSTER */}
          <MarketSentimentStrip tickers={tickers} />

          {/* SECTION 4 — WATCHLIST + MARKET SCROLLABLE DATA GRID */}
          <MarketDataGrid 
            tickers={tickers}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onToggleWatchlist={handleToggleWatchlist}
            onActionClick={(sym, mode) => handleActionClick(sym, mode)}
          />

          {/* SECTION 5 — MARKET MOVERS (GAINERS/LOSERS) */}
          <MarketMovers />

          {/* SECTION 6 — ALPHA FEED PREVIEW */}
          <AlphaFeedPreview limit={5} />

        </div>

        {/* COLUMN 3: RIGHT MINI RAIL INSIGHTS CARDS PANEL */}
        <div className="hidden xl:flex w-80 h-full border-l border-slate-900/60 overflow-y-auto premium-scrollbar">
          <div className="w-full p-4 space-y-6">
            {/* Verified Trader Positioning */}
            <VerifiedPositioning />
            
            {/* Market Insights Rail (Legacy - Optional) */}
            <MarketInsightsRail traders={SEED_TRADERS} />
          </div>
        </div>

      </div>

      {/* SECTION 7 — STICKY MOBILE ACTIONS BUY/SELL FOOTER */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 border-t border-slate-900/60 backdrop-blur-xl p-3 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-col select-none">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Trading Focused</span>
          <span className="text-xs font-black font-mono text-slate-200 mt-0.5">BTC/USD Quick Capture</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => handleActionClick('BTC' as AssetSymbol, 'BUY')}
            className="px-4 py-2 bg-emerald-500 font-mono font-black text-slate-950 text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Buy
          </button>
          <button 
            onClick={() => handleActionClick('BTC' as AssetSymbol, 'SELL')}
            className="px-4 py-2 bg-slate-900 border border-slate-800 font-mono font-black text-slate-200 text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            Sell
          </button>
          <button 
            onClick={() => handleActionClick('BTC' as AssetSymbol, 'DEPOSIT')}
            className="p-2 bg-amber-500 font-mono font-black text-slate-950 text-xs rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  )
}
