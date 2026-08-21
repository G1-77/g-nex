'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import ExecutionPanel from '@/components/market/asset/ExecutionPanel'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useUsdKesRate } from '@/lib/react-query/market/queries.market'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import { formatKes, formatUsd } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { TradeSide } from '@/lib/supabase/market.types'

interface TradePageProps {
  params: Promise<{ symbol: string }>
  searchParams: Promise<{ side?: string }>
}

export default function TradePage({ params, searchParams }: TradePageProps) {
  const resolvedParams = use(params)
  const resolvedSearch = use(searchParams)
  const symbol = resolvedParams.symbol.toUpperCase() as AssetSymbol
  const initialSide: TradeSide = resolvedSearch.side === 'sell' ? 'sell' : 'buy'

  const asset = MARKET_ASSETS[symbol]
  const { data: tickers = [] } = useMarketPrices([symbol])
  const { data: usdKes = 130 } = useUsdKesRate()

  const ticker = tickers.find((t) => t.symbol === symbol)
  const priceUsd = ticker?.priceUsd ?? 0
  const isPositive = (ticker?.change24h ?? 0) >= 0

  const safePrice = Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : 0

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <Link
          href={`/markets/${symbol.toLowerCase()}`}
          className="flex cursor-pointer items-center gap-2 font-mono text-[11px] font-black uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {symbol}
        </Link>
        <span className="font-mono text-[11px] text-slate-600">{symbol} · Trade</span>
      </header>

      <section className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              {asset?.name ?? symbol} live
            </p>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-slate-100">
              {safePrice > 0 ? formatUsd(safePrice) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-sm font-black ${
                isPositive ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isPositive ? '+' : ''}
              {(ticker?.change24h ?? 0).toFixed(2)}%
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">
              ≈ {formatKes(safePrice * usdKes)}
            </p>
          </div>
        </div>

        <ExecutionPanel symbol={symbol} initialSide={initialSide} />
      </section>
    </div>
  )
}