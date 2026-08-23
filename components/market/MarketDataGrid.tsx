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
      <div className="flex items-center justify-between pb-2 select-none">
        <span className="text-caption font-black uppercase tracking-wider text-text-muted">Market Dashboard</span>
        <div className="flex gap-1">
          {(['All', 'Crypto', 'Gold', 'Watchlist'] as MarketFilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`rounded-lg px-3 py-1.5 text-caption font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer gnex-touch-target ${
                activeFilter === filter
                  ? 'bg-brand text-text-inverse'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
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
              className="gnex-card gnex-card-hover p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Identity Token Box Section */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-surface flex items-center justify-center font-mono text-xs font-black text-text-secondary">
                  {ticker.symbol.slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-h3 text-text-primary">{ticker.name}</span>
                  <span className="font-mono text-caption font-bold text-text-muted uppercase tracking-widest">{ticker.symbol}/USD</span>
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
                          backgroundColor: isPositive ? UP_COLOR : DOWN_COLOR
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Price Values Action Block */}
              <div className="flex items-center justify-between md:justify-end gap-4 font-mono">
                <div className="flex flex-col md:items-end">
                  <span className="text-mono-lg text-text-primary font-black">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ticker.priceUsd)}
                  </span>
                  <span className="text-caption mt-0.5 font-bold" style={{ color: isPositive ? UP_COLOR : DOWN_COLOR }}>
                    {isPositive ? '+' : ''}{ticker.change24h.toFixed(2)}%
                  </span>
                </div>

                {/* Conversion Buttons Interceptors */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onActionClick(ticker.symbol, 'BUY')}
                    className="gnex-btn gnex-btn-success px-3 py-1.5 text-caption"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => onActionClick(ticker.symbol, 'SELL')}
                    className="gnex-btn gnex-btn-danger px-3 py-1.5 text-caption"
                  >
                    Sell
                  </button>
                  <button
                    onClick={() => onToggleWatchlist(ticker.symbol)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer gnex-touch-target ${
                      ticker.isWatching
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-text-secondary'
                    }`}
                    aria-label={ticker.isWatching ? `Remove ${ticker.symbol} from watchlist` : `Add ${ticker.symbol} to watchlist`}
                  >
                    <Star className={`h-4 w-4 fill-current ${ticker.isWatching ? 'text-amber-400' : ''}`} />
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

const UP_COLOR = '#8DFF45'
const DOWN_COLOR = '#FF5A5A'
