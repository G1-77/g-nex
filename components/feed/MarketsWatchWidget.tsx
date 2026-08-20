'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

import Sparkline from '@/components/market/Sparkline'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { usePriceHistory } from '@/lib/market/binance-realtime'
import { setFocusedAsset } from '@/lib/store/focused-asset'
import type { MarketTicker } from '@/lib/supabase/market.types'

const CHANGE_POSITIVE = '#8DFF45'
const CHANGE_NEGATIVE = '#FF5A5A'

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function WatchRow({ ticker, onOpen }: { ticker: MarketTicker; onOpen: (symbol: MarketTicker['symbol']) => void }) {
  const liveHistory = usePriceHistory(ticker.symbol)
  const sparkData = liveHistory.length >= 2 ? Array.from(liveHistory) : ticker.sparkline
  const isPositive = ticker.change24h >= 0

  return (
    <button
      type="button"
      onClick={() => onOpen(ticker.symbol)}
      className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-slate-800/40 hover:bg-slate-900/40"
    >
      <div className="flex min-w-[74px] flex-1 items-center gap-2.5">
        <Image
          src={ticker.logo}
          width={24}
          height={24}
          alt={ticker.name}
          className="h-6 w-6 shrink-0 rounded-full"
        />
        <div className="flex min-w-0 flex-col text-left">
          <span className="truncate text-sm font-bold text-slate-200 group-hover:text-white">
            {ticker.symbol}
          </span>
          <span className="truncate text-[11px] text-slate-500">{ticker.name}</span>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <Sparkline data={sparkData} color={isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE} width={40} height={14} className="shrink-0" />
        <div className="min-w-0 text-right">
          <p className="truncate font-mono text-xs font-semibold text-slate-200">
            {priceFormatter.format(ticker.priceUsd)}
          </p>
          <p
            className="truncate font-mono text-[10px] font-medium"
            style={{ color: isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE }}
          >
            {isPositive ? '+' : ''}
            {ticker.change24h.toFixed(2)}%
          </p>
        </div>
      </div>
    </button>
  )
}

export default function MarketsWatchWidget() {
  const router = useRouter()
  const { data: tickers = [] } = useMarketPrices([])

  const handleOpen = (symbol: MarketTicker['symbol']) => {
    setFocusedAsset(symbol)
    router.push(`/markets/${symbol.toLowerCase()}`)
  }

  return (
    <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Markets Watch
        </h2>

        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>

      <div className="space-y-1.5">
        {tickers.map((ticker) => (
          <WatchRow key={ticker.symbol} ticker={ticker} onOpen={handleOpen} />
        ))}
      </div>
    </div>
  )
}