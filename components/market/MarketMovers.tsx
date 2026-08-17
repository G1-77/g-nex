'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { fetchCryptoPrices } from '@/lib/market/coingecko'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { CoinGeckoMarket } from '@/types/market'

interface MarketMoverItem {
  symbol: AssetSymbol
  name: string
  priceUsd: number
  change24h: number
  type: 'gainer' | 'loser'
}

async function fetchMarketMovers(): Promise<{ gainers: MarketMoverItem[], losers: MarketMoverItem[] }> {
  const cryptoIds = Object.values(MARKET_ASSETS)
    .filter(a => a.assetType === 'crypto')
    .map(a => {
      const idMap: Record<string, string> = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        SOL: 'solana',
        XRP: 'ripple',
        USDT: 'tether'
      }
      return idMap[a.symbol]
    })
    .filter(Boolean)

  const data = await fetchCryptoPrices(cryptoIds)

  const movers: MarketMoverItem[] = data
    .filter((coin: CoinGeckoMarket) => coin.symbol.toUpperCase() !== 'USDT')
    .map((coin: CoinGeckoMarket) => ({
      symbol: coin.symbol.toUpperCase() as AssetSymbol,
      name: coin.name,
      priceUsd: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      type: coin.price_change_percentage_24h >= 0 ? 'gainer' as const : 'loser' as const
    }))

  const sortedByChange = [...movers].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))

  const gainers = sortedByChange.filter(m => m.type === 'gainer').slice(0, 3)
  const losers = sortedByChange.filter(m => m.type === 'loser').slice(0, 3)

  return { gainers, losers }
}

export default function MarketMovers() {
  const { data, isLoading } = useQuery({
    queryKey: ['market-movers'],
    queryFn: fetchMarketMovers,
    staleTime: 1000 * 5, // 5 seconds
    refetchInterval: 1000 * 5, // Refresh every 5 seconds
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-slate-900/40 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-slate-900/60 bg-slate-900/20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const { gainers = [], losers = [] } = data || {}

  return (
    <div className="space-y-4 w-full">
      {/* Top Gainers */}
      {gainers.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 select-none">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
              Top Gainers
            </h3>
          </div>

          <div className="space-y-2">
            {gainers.map((mover) => (
              <div
                key={mover.symbol}
                className="flex items-center justify-between rounded-xl border border-slate-900/60 bg-slate-900/20 p-3 transition-all hover:border-slate-800 hover:bg-slate-900/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-[10px] font-black text-slate-300">
                    {mover.symbol.slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-100">{mover.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{mover.symbol}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-200">
                    ${mover.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono font-black text-emerald-400">
                    +{mover.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Losers */}
      {losers.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 select-none">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
              Top Losers
            </h3>
          </div>

          <div className="space-y-2">
            {losers.map((mover) => (
              <div
                key={mover.symbol}
                className="flex items-center justify-between rounded-xl border border-slate-900/60 bg-slate-900/20 p-3 transition-all hover:border-slate-800 hover:bg-slate-900/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-[10px] font-black text-slate-300">
                    {mover.symbol.slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-100">{mover.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{mover.symbol}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-200">
                    ${mover.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono font-black text-rose-400">
                    {mover.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}