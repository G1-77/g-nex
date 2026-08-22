'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'

import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { setFocusedAsset } from '@/lib/store/focused-asset'
import type { MarketTicker } from '@/lib/supabase/market.types'

const UP_COLOR = '#8DFF45'
const DOWN_COLOR = '#FF5A5A'

export default function TopMoversWidget() {
  const router = useRouter()
  const { data: tickers = [] } = useMarketPrices([])

  const movers = [...tickers]
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 5)

  if (movers.length === 0) return null

  const handleOpen = (symbol: MarketTicker['symbol']) => {
    setFocusedAsset(symbol)
    router.push(`/markets/${symbol.toLowerCase()}`)
  }

  return (
    <div className="gnex-card p-4">
      <h2 className="mb-3 text-caption font-bold uppercase tracking-wider text-text-muted">Top Movers</h2>

      <div className="space-y-1">
        {movers.map((ticker) => {
          const isPositive = ticker.change24h >= 0

          return (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => handleOpen(ticker.symbol)}
              className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-body-sm transition-colors hover:bg-surface-hover gnex-touch-target"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Image
                  src={ticker.logo}
                  width={20}
                  height={20}
                  alt={ticker.name}
                  className="h-5 w-5 shrink-0 rounded-full"
                />
                <span className="truncate font-medium text-text-secondary group-hover:text-text-primary">
                  {ticker.symbol}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono font-bold"
                  style={{ color: isPositive ? UP_COLOR : DOWN_COLOR }}
                >
                  {isPositive ? '+' : ''}
                  {ticker.change24h.toFixed(2)}%
                </span>
                <ChevronRight className="h-3 w-3 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}