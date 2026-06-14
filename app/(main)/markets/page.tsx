'use client'

import { useState } from 'react'
import { Coins, LayoutGrid } from 'lucide-react'

import StoriesCarousel from '@/components/market/StoriesCarousel'
import { MarketTicker } from '@/lib/supabase/market.types'
import { AssetSymbol } from '@/lib/supabase/types'

// Complete baseline array seeding all 6 MVP tokens into your Phase 1 layouts
const SEED_TICKERS: MarketTicker[] = [
  { symbol: 'BTC' as AssetSymbol, priceUsd: 72572.00, change24h: 2.41, bullishPercent: 76, isWatching: true },
  { symbol: 'ETH' as AssetSymbol, priceUsd: 3420.50, change24h: 1.85, bullishPercent: 67, isWatching: false },
  { symbol: 'SOL' as AssetSymbol, priceUsd: 154.35, change24h: -0.92, bullishPercent: 82, isWatching: true },
  { symbol: 'XRP' as AssetSymbol, priceUsd: 0.58, change24h: 4.20, bullishPercent: 51, isWatching: false },
  { symbol: 'USDT' as AssetSymbol, priceUsd: 1.00, change24h: 0.00, bullishPercent: 50, isWatching: false },
  { symbol: 'XAU' as AssetSymbol, priceUsd: 2342.10, change24h: -0.35, bullishPercent: 43, isWatching: false },
]

export default function MarketFoundationHub() {
  const [tickers, setTickers] = useState<MarketTicker[]>(SEED_TICKERS)

  const handleToggleWatchlist = (symbol: AssetSymbol) => {
    setTickers((prev) =>
      prev.map((item) =>
        item.symbol === symbol ? { ...item, isWatching: !item.isWatching } : item
      )
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6 flex flex-col">
        
        {/* MarketHeader Block Section */}
        <div className="flex flex-col select-none border-b border-slate-900 pb-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-slate-100 font-mono">
            GNEX Markets
          </h1>
          <p className="text-[11px] text-slate-500 font-bold tracking-wide mt-0.5">
            Discover crowdsourced alpha and verified trader behavior matrices.
          </p>
        </div>

        {/* StoriesCarousel Section Container Block */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest select-none">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span>Market Pulse Discovery</span>
          </div>
          
          <StoriesCarousel 
            tickers={tickers} 
            onToggleWatchlist={handleToggleWatchlist} 
          />
        </div>

        {/* 
          Visual Stubs Grid Layout 
          Lays down placeholder parameters for your remaining Phase 1 preview metrics modules.
          Keeps structural alignment clean before we run our live Supabase connection scripts.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-900 bg-slate-950/95 p-5 backdrop-blur-xl space-y-2 select-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MarketSentimentPreview</span>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex"><div className="h-full bg-[#8DFF45]" style={{ width: '76%' }} /></div>
          </div>

          <div className="rounded-2xl border border-slate-900 bg-slate-950/95 p-5 backdrop-blur-xl space-y-2 select-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">PositioningPreview</span>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: '54%' }} /></div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-900 bg-slate-900/10 p-12 text-center select-none">
          <LayoutGrid className="h-5 w-5 text-slate-700 mx-auto" />
          <h3 className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            WatchlistPreview & MarketMoversPreview Container Active
          </h3>
          <p className="mt-1 text-[11px] text-slate-600 max-w-[280px] mx-auto">
            Phase 1 foundation layout contracts are written. Ready to map dynamic subrouting scripts next.
          </p>
        </div>

      </div>
    </div>
  )
}
