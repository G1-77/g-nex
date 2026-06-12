'use client'

import { useState } from 'react'
import { BarChart3, Wallet, Users, LayoutGrid, Award, ShieldAlert } from 'lucide-react'
import type { MarketFilterType, AssetStoryNode } from '@/lib/supabase/market.types'

import MarketFilterChips from '@/components/market/MarketFilterChips'
import AssetStoryCarousel from '@/components/market/AssetStoryCarousel'

// Mock static initialization block mapping parameters safely for the initial Phase 1 layout
const INITIAL_STORY_DATA: AssetStoryNode[] = [
  { symbol: 'BTC', name: 'Bitcoin', priceUsd: 56450.00, change24h: 2.41, bullishPercent: 63, isWatching: true },
  { symbol: 'ETH', name: 'Ethereum', priceUsd: 3420.50, change24h: 1.85, bullishPercent: 58, isWatching: false },
  { symbol: 'SOL', name: 'Solana', priceUsd: 154.35, change24h: -0.92, bullishPercent: 71, isWatching: true },
  { symbol: 'XRP', name: 'Ripple', priceUsd: 0.58, change24h: -4.20, bullishPercent: 42, isWatching: false },
  { symbol: 'USDT', name: 'Tether', priceUsd: 1.00, change24h: 0.00, bullishPercent: 50, isWatching: false },
  { symbol: 'XAU', name: 'Spot Gold', priceUsd: 2342.10, change24h: 0.35, bullishPercent: 18, isWatching: false },
]

export default function MarketLandingPage() {
  const [activeFilter, setActiveFilter] = useState<MarketFilterType>('All')
  const [stories, setStories] = useState<AssetStoryNode[]>(INITIAL_STORY_DATA)

  const handleToggleWatchlist = (symbol: string) => {
    setStories((prev) =>
      prev.map((item) =>
        item.symbol === symbol ? { ...item, isWatching: !item.isWatching } : item
      )
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      
      {/* 3-COLUMN DESKTOP / SINGLE COLUMN MOBILE MASTER SYSTEM MESH LAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* CENTER MAIN CONTENT CANVAS (Occupies 3 columns on wide grids) */}
        <div className="col-span-1 lg:col-span-3 space-y-6 flex flex-col">
          
          {/* HEADER STRIP ROW DISPLAY PANEL */}
          <div className="flex flex-col select-none">
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-100">
              GNEX Markets
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">
              Discover real-time intelligence alpha and verified trading exposure.
            </p>
          </div>

          {/* LAYER 1: NAVIGATION SPLIT FILTER CHIPS */}
          <MarketFilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          {/* LAYER 2: FACEBOOK-STYLE STORIES VISUAL CAROUSEL */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 select-none">
              High Engagement Asset Discovery
            </span>
            <AssetStoryCarousel
              stories={stories}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>

          {/* LAYER 3: CORE CONTENT STUBS (Ready for Phase 2 and 3 layout hydration) */}
          <div className="rounded-2xl border border-dashed border-slate-900 bg-slate-900/10 p-12 text-center select-none animate-fadeIn">
            <LayoutGrid className="h-5 w-5 text-slate-700 mx-auto" />
            <h3 className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Asset Tables Dashboard Blueprint Active
            </h3>
            <p className="mt-1 text-[11px] text-slate-600 max-w-[280px] mx-auto">
              Phase 1 static wireframes are fully success aligned. Ready to inject CoinGecko REST pipelines next.
            </p>
          </div>

        </div>

        {/* =========================================================================
            RIGHT RAIL INSIGHTS LAYER PANEL (DESKTOP STRUCTURE ONLY)
            ========================================================================= */}
        <div className="hidden lg:flex flex-col col-span-1 space-y-5 bg-slate-900/20 border border-slate-900 rounded-2xl p-4 backdrop-blur-md min-h-[70vh] select-none">
          
          {/* WALLET METRIC CONVERSION BANNER SLOT */}
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3.5 flex flex-col">
            <div className="flex items-center gap-2 text-emerald-400">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide uppercase">Available Balance</span>
            </div>
            <span className="text-lg font-black font-mono mt-1.5 text-slate-100">
              KES 10,000.00
            </span>
            <span className="text-[10px] text-slate-500 font-medium font-sans mt-0.5">
              Local currency motivation engine active
            </span>
          </div>

          {/* SOCIAL REAL-TIME PROOF SUMMARY PREVIEW STUB */}
          <div className="space-y-3 flex-1 flex flex-col justify-start pt-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Users className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-wider">Live Activity Stream</span>
            </div>
            
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-400 leading-normal border-l border-slate-800 pl-3">
                <span className="font-bold text-slate-200">@mwangi</span> added <span className="font-mono font-bold text-slate-300">XAU</span> to watchlist
              </div>
              <div className="text-[11px] text-slate-400 leading-normal border-l border-slate-800 pl-3">
                <span className="font-bold text-slate-200">@juma</span> opened a long position on <span className="font-mono font-bold text-slate-300">BTC</span>
              </div>
            </div>
          </div>

          {/* MACRO VOLATILITY CALENDAR STATUS COMPACT FLAG */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-3 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Macro Event Risk</span>
              <span className="text-[11px] text-slate-200 font-medium mt-0.5 truncate">US CPI Print in 01h 45m</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
