'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
  maximumFractionDigits: 0,
})

interface TickerItemProps {
  ticker: MarketTicker
  onOpen: (symbol: MarketTicker['symbol']) => void
}

function TickerItem({ ticker, onOpen }: TickerItemProps) {
  const liveHistory = usePriceHistory(ticker.symbol)
  const sparkData = liveHistory.length >= 2 ? Array.from(liveHistory) : ticker.sparkline
  const isPositive = ticker.change24h >= 0

  return (
    <button
      type="button"
      onClick={() => onOpen(ticker.symbol)}
      className="flex shrink-0 cursor-pointer items-center gap-2.5 border-r border-slate-900/60 px-4 transition-colors hover:bg-slate-900/40"
    >
      <Image
        src={ticker.logo}
        width={20}
        height={20}
        alt={ticker.name}
        className="h-5 w-5 shrink-0 rounded-full"
      />
      <span className="font-mono text-xs font-black text-slate-200">{ticker.symbol}</span>
      <span className="font-mono text-xs tabular-nums text-slate-400">
        {priceFormatter.format(ticker.priceUsd)}
      </span>
      <span
        className="font-mono text-[11px] font-bold tabular-nums"
        style={{ color: isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE }}
      >
        {isPositive ? '+' : ''}
        {ticker.change24h.toFixed(2)}%
      </span>
      <Sparkline data={sparkData} color={isPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE} width={40} height={14} />
    </button>
  )
}

export default function TickerStrip() {
  const router = useRouter()
  const { data: tickers = [] } = useMarketPrices([])

  if (tickers.length === 0) return null

  const handleOpen = (symbol: MarketTicker['symbol']) => {
    setFocusedAsset(symbol)
    router.push(`/markets/${symbol.toLowerCase()}`)
  }

  const list = tickers.map((ticker) => (
    <TickerItem key={ticker.symbol} ticker={ticker} onOpen={handleOpen} />
  ))

  const half = <div className="flex shrink-0 items-stretch">{list}{list}{list}</div>

  return (
    <div className="mask-fade-x overflow-hidden border-b border-slate-900/60 bg-slate-950/80 backdrop-blur-md">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {half}
        {half}
      </div>
    </div>
  )
}