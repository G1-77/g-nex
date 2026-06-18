'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Plus } from 'lucide-react'

import MarketSidebar from '@/components/market/MarketSidebar'
import StoriesCarousel from '@/components/market/StoriesCarousel'
import MarketSentimentStrip from '@/components/market/MarketSentimentStrip'
import MarketDataGrid from '@/components/market/MarketDataGrid'
import type { AssetSymbol } from '@/lib/supabase/types'
import { MarketFilterType, MarketTicker, VerifiedTraderAllocation } from '@/lib/supabase/market.types'
import MarketInsightsRail from '@/components/market/MarketInsightRail'


const SEED_TICKERS: MarketTicker[] = [
  { symbol: 'BTC' as AssetSymbol, name: 'Bitcoin', priceUsd: 68572.00, change24h: 2.41, bullishPercent: 76, watcherCount: 1420, isWatching: true, sparkline: [67100, 67500, 68200, 67900, 68400, 68572] },
  { symbol: 'ETH' as AssetSymbol, name: 'Ethereum', priceUsd: 3420.50, change24h: 1.85, bullishPercent: 68, watcherCount: 945, isWatching: false, sparkline: [3310, 3350, 3390, 3340, 3400, 3420.5] },
  { symbol: 'SOL' as AssetSymbol, name: 'Solana', priceUsd: 154.35, change24h: -0.92, bullishPercent: 82, watcherCount: 1102, isWatching: true, sparkline: [158, 156, 152, 155, 153, 154.35] },
  { symbol: 'XRP' as AssetSymbol, name: 'Ripple', priceUsd: 0.58, change24h: 4.20, bullishPercent: 51, watcherCount: 412, isWatching: false, sparkline: [0.55, 0.56, 0.54, 0.57, 0.56, 0.58] },
  { symbol: 'USDT' as AssetSymbol, name: 'Tether', priceUsd: 1.00, change24h: 0.00, bullishPercent: 50, watcherCount: 184, isWatching: false, sparkline: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  { symbol: 'XAU' as AssetSymbol, name: 'Spot Gold', priceUsd: 2342.10, change24h: -0.35, bullishPercent: 43, watcherCount: 684, isWatching: false, sparkline: [2360, 2355, 2350, 2348, 2345, 2342.1] },
]

const SEED_TRADERS: VerifiedTraderAllocation[] = [
  { id: '1', username: 'alpha_wolf', avatarUrl: '/avatars/1.jpg', monthlyRoi: 42.3, primaryAsset: 'BTC' as AssetSymbol, allocationPercent: 72 },
  { id: '2', username: 'kenyan_trader', avatarUrl: '/avatars/2.jpg', monthlyRoi: 34.8, primaryAsset: 'XAU' as AssetSymbol, allocationPercent: 54 }
]

export default function MarketHomePage() {
  const router = useRouter()
  const [tickers, setTickers] = useState<MarketTicker[]>(SEED_TICKERS)
  const [activeFilter, setActiveFilter] = useState<MarketFilterType>('All')

  const handleToggleWatchlist = (symbol: AssetSymbol) => {
    setTickers((prev) =>
      prev.map((item) => item.symbol === symbol ? { ...item, isWatching: !item.isWatching } : item)
    )
  }

  const handleActionClick = (symbol: AssetSymbol, viewMode: 'BUY' | 'SELL' | 'DEPOSIT') => {
    if (viewMode === 'DEPOSIT') {
      alert('Redirecting to local instant payment rails...')
      return
    }
    router.push(`/market/${symbol.toLowerCase()}?mode=${viewMode.toLowerCase()}`)
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

        </div>

        {/* COLUMN 3: RIGHT MINI RAIL INSIGHTS CARDS PANEL */}
        <MarketInsightsRail traders={SEED_TRADERS} />

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
