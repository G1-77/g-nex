'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Activity, Plus } from 'lucide-react'

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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden pb-24 lg:pb-6">
      
      {/* SECTION 1 — TOP NAVBAR DISPLAY */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-900/80 bg-slate-950/80 p-3 backdrop-blur-xl select-none">
        <div className="w-full flex items-center justify-between px-2 md:px-4">
          <div className="text-base font-black tracking-tighter text-amber-500 font-mono cursor-pointer" onClick={() => router.push('/')}>GNEX</div>
          <div className="w-48 md:w-72 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-500 text-xs font-medium flex items-center justify-between cursor-pointer">
            <span>Search assets, traders...</span>
            <span className="text-[9px] font-mono border border-slate-800 bg-slate-950 px-1 rounded">/</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400 cursor-pointer hover:text-slate-200">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer" />
          </div>
        </div>
      </header>

      {/* MAIN RESPONSIVE VIEWPORT MESH */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 md:p-6 items-start max-w-[1600px] mx-auto">
        
        {/* CENTER CONVERSION CONTENT CANVAS CONTAINER (Spans 3 Columns) */}
        <div className="col-span-1 lg:col-span-3 space-y-6 flex flex-col w-full">
          
          {/* SECTION 2 — HERO STORIES CAROUSEL ROW */}
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

          {/* SECTION 3 — COMPACT HORIZONTAL SENTIMENT STRIP */}
          <MarketSentimentStrip tickers={tickers} />

          {/* SECTION 4 — HIGH PERFORMANCE SCROLLABLE MARKET MATRIX LIST */}
          <MarketDataGrid 
            tickers={tickers}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onToggleWatchlist={handleToggleWatchlist}
            onActionClick={(sym, mode) => handleActionClick(sym, mode)}
          />
        </div>

        {/* SECTION 5 & 6 — SPLICED DECOUPLED INSIGHTS SIDEBAR CARDS RAIL */}
        <MarketInsightsRail traders={SEED_TRADERS} />

      </div>

      {/* SECTION 7 — STICKY MOBILE CONVERSION FLOATING FOOTER */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 border-t border-slate-900 backdrop-blur-xl p-3 flex items-center justify-between gap-3 shadow-2xl">
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
