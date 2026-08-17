'use client'

import Image from 'next/image'

import Sparkline from '@/components/market/Sparkline'
import { usePriceHistory } from '@/lib/market/binance-realtime'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

const CHANGE_POSITIVE = '#8DFF45'
const CHANGE_NEGATIVE = '#FF5A5A'

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

interface AssetRowProps {
  ticker: MarketTicker
  onOpen: (symbol: AssetSymbol) => void
}

export default function AssetRow({ ticker, onOpen }: AssetRowProps) {
  const liveHistory = usePriceHistory(ticker.symbol)
  const sparkData = liveHistory.length >= 2 ? Array.from(liveHistory) : ticker.sparkline
  const isPositive = ticker.change24h >= 0

  return (
    <button
      type="button"
      onClick={() => onOpen(ticker.symbol)}
      className="grid w-full cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-slate-900/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-900/40"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Image
          src={ticker.logo}
          width={28}
          height={28}
          alt={ticker.name}
          className="h-7 w-7 shrink-0 rounded-full"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-black text-slate-100">{ticker.symbol}</span>
          <span className="truncate font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {ticker.name}
          </span>
        </div>
      </div>

      <div className="flex w-16 items-center justify-center">
        <Sparkline data={sparkData} color={isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE} />
      </div>

      <span className="font-mono text-xs font-black tabular-nums text-slate-100">
        {priceFormatter.format(ticker.priceUsd)}
      </span>

      <span
        className="w-14 text-right font-mono text-xs font-black tabular-nums"
        style={{ color: isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE }}
      >
        {isPositive ? '+' : ''}
        {ticker.change24h.toFixed(2)}%
      </span>
    </button>
  )
}
