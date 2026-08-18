'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { setFocusedAsset } from '@/lib/store/focused-asset'
import type { MarketTicker } from '@/lib/supabase/market.types'

const CHANGE_POSITIVE = '#8DFF45'
const CHANGE_NEGATIVE = '#FF5A5A'

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
    <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4 backdrop-blur-md">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Top Movers
      </h2>

      <div className="space-y-1">
        {movers.map((ticker) => {
          const isPositive = ticker.change24h >= 0

          return (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => handleOpen(ticker.symbol)}
              className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 text-xs transition-colors hover:bg-slate-900/30"
            >
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={ticker.logo}
                  width={20}
                  height={20}
                  alt={ticker.name}
                  className="h-5 w-5 shrink-0 rounded-full"
                />
                <span className="truncate font-medium text-slate-400 group-hover:text-slate-200">
                  {ticker.symbol}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono font-bold"
                  style={{ color: isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE }}
                >
                  {isPositive ? '+' : ''}
                  {ticker.change24h.toFixed(2)}%
                </span>
                <ChevronRight className="h-3 w-3 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}