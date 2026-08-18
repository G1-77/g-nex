'use client'

import { Star } from 'lucide-react'
import SparklineArea from '@/components/market/SparklineArea'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

const UP_COLOR = '#8DFF45'
const DOWN_COLOR = '#FF5A5A'

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })
}

interface AssetSparklineCardProps {
  ticker: MarketTicker
  onOpen: (symbol: AssetSymbol) => void
  onToggleWatchlist: (symbol: AssetSymbol) => void
}

export default function AssetSparklineCard({
  ticker,
  onOpen,
  onToggleWatchlist,
}: AssetSparklineCardProps) {
  const positive = ticker.change24h >= 0
  const color = positive ? UP_COLOR : DOWN_COLOR

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(ticker.symbol)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(ticker.symbol)
      }}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-900/60 bg-slate-900/20 p-3 transition-all duration-200 hover:border-slate-700/60 hover:bg-slate-900/40"
    >
      {/* Asset identity */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ticker.logo}
            alt={ticker.name}
            className="h-7 w-7 shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-100">{ticker.name}</p>
            <p className="font-mono text-[9px] font-black uppercase tracking-wider text-slate-500">
              {ticker.symbol}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={ticker.isWatching ? `Remove ${ticker.symbol} from watchlist` : `Add ${ticker.symbol} to watchlist`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatchlist(ticker.symbol)
          }}
          className={`cursor-pointer rounded-md p-1 transition-colors hover:bg-slate-800/60 ${
            ticker.isWatching ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${ticker.isWatching ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* Primary metric + change badge */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="font-mono text-sm font-black tabular-nums tracking-tight text-slate-50">
          ${formatPrice(ticker.priceUsd)}
        </span>
        <span
          className="shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums"
          style={{
            color,
            borderColor: `${color}33`,
            backgroundColor: `${color}0f`,
          }}
        >
          {positive ? '+' : ''}
          {ticker.change24h.toFixed(2)}%
        </span>
      </div>

      {/* Bottom-aligned area sparkline */}
      <div className="mt-2 h-8 w-full">
        <SparklineArea
          data={ticker.sparkline}
          color={color}
          height={32}
          className="h-full w-full"
        />
      </div>
    </div>
  )
}