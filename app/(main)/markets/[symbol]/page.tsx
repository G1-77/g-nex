'use client'

import { useMemo, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { MarketTicker, VerifiedTraderAllocation } from '@/lib/supabase/market.types'

import AssetHero from '@/components/market/asset/AssetHero'
import TradingViewChart from '@/components/market/asset/TradingViewChart'
import SocialSignalsGrid from '@/components/market/asset/SocialSignalsGrid'

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

  const handleToggleWatchlist = (symbol: AssetSymbol) => {
    alert(`Watchlist tracking update triggered for: ${symbol}`)
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 p-4 md:p-6 font-sans overflow-hidden flex flex-col selection:bg-amber-500/30">
      
      {/* 3-COLUMN LAYOUT SCROLL CONTAINER MESH */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start max-w-412.5 mx-auto overflow-hidden">
        
        {/* CENTER CONVERSION CANVAS (Scrolls independently while keeping sidebars sticky) */}
        <div className="col-span-1 lg:col-span-3 h-full overflow-y-auto pr-1 space-y-6 flex flex-col w-full scrollbar-none pb-24 lg:pb-8">
          
          <AssetHero 
            asset={assetPayload} 
            onToggleWatchlist={handleToggleWatchlist} 
          />
          
          <TradingViewChart 
            symbol={assetPayload.symbol} 
          />
          
          <SocialSignalsGrid 
            symbol={assetPayload.symbol}
            bullishPercent={assetPayload.bullishPercent}
            traders={SEED_TRADERS}
          />

          {/* Wireframe Alpha Feed Box Container Stub for Part 2 */}
          <div className="rounded-2xl border border-dashed border-slate-900 bg-slate-900/10 p-10 text-center select-none">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alpha Feed Container Active</h4>
            <p className="text-[11px] text-slate-600 max-w-60 mx-auto mt-1">
              Phase 1 Conviction Layers are fully written. Ready to map TikTok-style engagement comment threads next.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN FIXED EXECUTION SIDEBAR CARDS PANEL */}
        <div className="col-span-1 bg-slate-900/10 border border-slate-900 rounded-2xl p-4 backdrop-blur-xl min-h-125 flex flex-col items-center justify-center text-center select-none shadow-xl sticky top-0">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
            Conversion Engine
          </span>
          <p className="text-xs text-slate-600 max-w-45 mt-2 leading-relaxed">
            Phase 1 core frame infrastructure is solid. Ready to hook your quick selector tags and KES transaction selectors next.
          </p>
        </div>

      </div>
    </div>
  )
}
