'use client'

import { Star } from 'lucide-react'
import type { AssetSymbol } from '@/lib/supabase/types'
import { MarketFilterType, MarketTicker } from '@/lib/supabase/market.types'

interface MarketDataGridProps {
  tickers: MarketTicker[]
  activeFilter: MarketFilterType
  onFilterChange: (filter: MarketFilterType) => void
  onToggleWatchlist: (symbol: AssetSymbol) => void
  onActionClick: (symbol: AssetSymbol, mode: 'BUY' | 'SELL') => void
}

export default function MarketDataGrid({
  tickers,
  activeFilter,
  onFilterChange,
  onToggleWatchlist,
  onActionClick,
}: MarketDataGridProps) {
  
  const filteredTickers = tickers.filter((ticker) => {
    if (activeFilter === 'Crypto') return ticker.symbol !== 'XAU' && ticker.symbol !== 'USDT'
    if (activeFilter === 'Gold') return ticker.symbol === 'XAU'
    if (activeFilter === 'Watchlist') return ticker.isWatching
    return true
  })

  return (
    <div className="space-y-3 w-full">
      {/* Table Sub-Header Control Bar Layer */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2 select-none">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Market Dashboard</span>
        <div className="flex gap-1">
          {(['All', 'Crypto', 'Gold', 'Watchlist'] as MarketFilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: activeFilter === filter ? '#f59e0b' : 'transparent',
                color: activeFilter === filter ? '#020617' : '#94a3b8',
                borderColor: '#1e293b'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Structured Asset Row Dynamic Mapping Loop */}
      <div className="space-y-2 w-full">
        {filteredTickers.map((ticker) => {
          const isPositive = ticker.change24h >= 0
          const points = ticker.sparkline && ticker.sparkline.length > 0 ? ticker.sparkline : [10, 10, 10, 10, 10, 10]
          const minPoint = Math.min(...points)
          const maxPoint = Math.max(...points)
          const range = maxPoint - minPoint === 0 ? 1 : maxPoint - minPoint

          return (
            <div
              key={ticker.symbol}
              className="w-full flex flex-col md:flex-row md:items-center justify-between bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900/60 rounded-xl p-4 gap-4 transition-all duration-200 cursor-pointer hover:border-slate-800 shadow-md group"
            >
              {/* Identity Token Box Section */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-xs font-black text-slate-300">
                  {ticker.symbol.slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-100">{ticker.name}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{ticker.symbol}/USD</span>
                </div>
              </div>

              {/* High-Performance Isolated Numerical Sparkline */}
              <div className="hidden md:flex items-center w-24 h-6 opacity-40 group-hover:opacity-70 transition-opacity">
                <div className="flex items-end gap-0.5 w-full h-full">
                  {points.map((val, idx) => {
                    const heightPct = ((val - minPoint) / range) * 100
                    return (
                      <div
                        key={idx}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${Math.max(heightPct, 15)}%`,
                          backgroundColor: isPositive ? '#8DFF45' : '#FF5A5A'
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Price Values Action Block */}
              <div className="flex items-center justify-between md:justify-end gap-6 font-mono text-xs font-bold">
                <div className="flex flex-col md:items-end">
                  <span className="text-slate-100 font-black">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ticker.priceUsd)}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: isPositive ? '#8DFF45' : '#FF5A5A' }}>
                    {isPositive ? '+' : ''}{ticker.change24h.toFixed(2)}%
                  </span>
                </div>

                {/* Conversion Buttons Interceptors */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onActionClick(ticker.symbol, 'BUY')}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase cursor-pointer tracking-wider rounded-lg active:scale-95 transition-all shadow-sm"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => onActionClick(ticker.symbol, 'SELL')}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-black uppercase cursor-pointer tracking-wider rounded-lg active:scale-95 transition-all"
                  >
                    Sell
                  </button>
                  <button
                    onClick={() => onToggleWatchlist(ticker.symbol)}
                    className="p-1.5 rounded-lg border transition-all cursor-pointer"
                    style={{
                      backgroundColor: ticker.isWatching ? '#f59e0b' : '#0f172a',
                      borderColor: ticker.isWatching ? '#d97706' : '#1e293b',
                      color: ticker.isWatching ? '#020617' : '#64748b'
                    }}
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </button>
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
