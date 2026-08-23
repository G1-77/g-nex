'use client'

import { Star } from 'lucide-react'
import Image from 'next/image'
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

function formatPriceCompact(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
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
      className="group gnex-card gnex-interactive p-4 flex flex-col"
    >
      {/* Asset identity */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src={ticker.logo}
            alt={ticker.name}
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-h3 text-text-primary">{ticker.name}</p>
            <p className="font-mono text-caption font-black uppercase tracking-wider text-text-muted">
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
          className="cursor-pointer rounded-md p-1.5 transition-colors hover:bg-surface-hover gnex-touch-target shrink-0"
        >
          <Star className={`h-4 w-4 ${ticker.isWatching ? 'fill-amber-400 text-amber-400' : 'text-text-muted'}`} />
        </button>
      </div>

      {/* Primary metric + change badge */}
      <div className="mt-4 flex items-end justify-between gap-2">
        <span className="font-mono text-mono-lg sm:text-mono-xl tabular-nums tracking-tight text-text-primary shrink-0">
          ${formatPrice(ticker.priceUsd)}
        </span>
        <span
          className="shrink-0 rounded-md px-2 py-0.5 font-mono text-caption font-black tabular-nums"
          style={{
            color,
            backgroundColor: `${color}0f`,
          }}
        >
          {positive ? '+' : ''}
          {ticker.change24h.toFixed(2)}%
        </span>
      </div>

      {/* Bottom-aligned area sparkline */}
      <div className="mt-3 h-8 w-full">
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