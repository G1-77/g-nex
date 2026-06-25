'use client'

import { useMemo } from 'react'
import { useParams, notFound } from 'next/navigation'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { VerifiedTraderAllocation } from '@/lib/supabase/market.types'

import MarketSidebar from '@/components/market/MarketSidebar'
import AssetHero from '@/components/market/asset/AssetHero'
import TradingViewChart from '@/components/market/asset/TradingViewChart'
import SocialSignalsGrid from '@/components/market/asset/SocialSignalsGrid'
import ExecutionPanel from '@/components/market/asset/ExecutionPanel'

const DETAIL_FALLBACKS: Record<AssetSymbol, { priceUsd: number; change24h: number; bullishPercent: number; volume24h: number; marketCapUsd: number; watcherCount: number }> = {
  BTC: { priceUsd: 72450.22, change24h: 4.82, bullishPercent: 82, volume24h: 28350000000, marketCapUsd: 1420000000000, watcherCount: 12452 },
  ETH: { priceUsd: 3870.21, change24h: 6.25, bullishPercent: 68, volume24h: 14200000000, marketCapUsd: 410000000000, watcherCount: 945 },
  SOL: { priceUsd: 165.34, change24h: 8.62, bullishPercent: 84, volume24h: 3800000000, marketCapUsd: 72000000000, watcherCount: 1102 },
  XRP: { priceUsd: 0.58, change24h: 4.20, bullishPercent: 51, volume24h: 980000000, marketCapUsd: 32000000000, watcherCount: 412 },
  USDT: { priceUsd: 1.00, change24h: 0.00, bullishPercent: 50, volume24h: 45000000000, marketCapUsd: 112000000000, watcherCount: 184 },
  XAU: { priceUsd: 2342.10, change24h: -0.35, bullishPercent: 43, volume24h: 21000000000, marketCapUsd: 14000000000000, watcherCount: 684 },
}

const SEED_TRADERS: VerifiedTraderAllocation[] = [
  { id: '1', username: 'ahelstakov', avatarUrl: '', monthlyRoi: 32.41, primaryAsset: 'BTC' as AssetSymbol, allocationPercent: 72 },
  { id: '2', username: 'kenyan_wolf', avatarUrl: '', monthlyRoi: 21.78, primaryAsset: 'XAU' as AssetSymbol, allocationPercent: 54 }
]

export default function AssetDetailPage() {
  const routerParams = useParams()
  const rawSymbol = typeof routerParams?.symbol === 'string' ? routerParams.symbol : ''
  const dynamicSymbol = rawSymbol.toUpperCase()

  const assetMetadata = MARKET_ASSETS[dynamicSymbol as AssetSymbol]
  if (!rawSymbol || !assetMetadata) {
    notFound()
  }

  const assetPayload = useMemo(() => {
    const fallback = DETAIL_FALLBACKS[dynamicSymbol as AssetSymbol]
    return {
      symbol: dynamicSymbol as AssetSymbol,
      name: assetMetadata.name,
      priceUsd: fallback.priceUsd,
      change24h: fallback.change24h,
      volume24h: fallback.volume24h,
      marketCapUsd: fallback.marketCapUsd,
      watcherCount: fallback.watcherCount,
      isWatching: dynamicSymbol === 'BTC',
      bullishPercent: fallback.bullishPercent,
    }
  }, [dynamicSymbol, assetMetadata])

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased overflow-y-auto selection:bg-amber-500/30">
      <div className="w-full flex max-w-412.5 mx-auto items-start relative">
        
        {/* COLUMN 1: LEFT NAVIGATION SIDEBAR */}
        <MarketSidebar />

        {/* COLUMN 2: CENTER CANVAS WORKSPACE CORE */}
        <div className="flex-1 min-w-0 p-4 md:p-6 space-y-6 flex flex-col w-full pb-32 lg:pb-12">
          <AssetHero 
            asset={assetPayload} 
            onToggleWatchlist={(sym) => alert(`Watchlist sync toggled for: ${sym}`)} 
          />
          <TradingViewChart 
            symbol={assetPayload.symbol} 
          />
          <SocialSignalsGrid 
            symbol={assetPayload.symbol}
            bullishPercent={assetPayload.bullishPercent}
            traders={SEED_TRADERS}
          />
        </div>

        {/* COLUMN 3: RIGHT TRANSACTION SIDEBAR PANEL */}
        <ExecutionPanel symbol={assetPayload.symbol} />

      </div>
    </div>
  )
}
