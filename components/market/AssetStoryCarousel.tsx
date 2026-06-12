'use client'

import { useEffect, useState, useMemo } from 'react'
// import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Star, TrendingUp, TrendingDown } from 'lucide-react'
import type { AssetStoryCarouselProps, } from '@/lib/supabase/market.types'

// Static configuration map assigning icons cleanly without causing duplicate query locks
const ASSET_METADATA_PRESETS: Record<string, { logo: string; name: string }> = {
  BTC: { logo: '/icons/btc.svg', name: 'Bitcoin' },
  ETH: { logo: '/icons/eth.svg', name: 'Ethereum' },
  SOL: { logo: '/icons/sol.svg', name: 'Solana' },
  XRP: { logo: '/icons/xrp.svg', name: 'Ripple' },
  USDT: { logo: '/icons/usdt.svg', name: 'Tether' },
  XAU: { logo: '/icons/xau.svg', name: 'Spot Gold' },
}

export default function AssetStoryCarousel({
  stories,
  onToggleWatchlist,
}: AssetStoryCarouselProps) {
  const router = useRouter()
  const [startIndex, setStartIndex] = useState(0)

  // AUTOMATED 5-SECOND SLIDING CAROUSEL TIMING CONTROLLER
  useEffect(() => {
    if (stories.length <= 3) return // No need to cycle if assets fit on one page

    const interval = setInterval(() => {
      setStartIndex((prevIndex) => {
        // Increment by 1 step, or loop back cleanly to the start index point
        return (prevIndex + 1) % (stories.length - 2)
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [stories.length])

  // Extract exactly three asset story cards for the active mobile window frame
  const visibleStories = useMemo(() => {
    if (stories.length <= 3) return stories
    return stories.slice(startIndex, startIndex + 3)
  }, [stories, startIndex])

  const formatPrice = (price: number, symbol: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: symbol === 'XAU' || symbol === 'USDT' || symbol === 'XRP' ? 2 : 0,
    }).format(price)
  }

  return (
    <div className="w-full select-none relative overflow-hidden py-1">
      {/* 
        Responsive layouts box wrapper: 
        Desktop expands to display all cards side-by-side, 
        Mobile restricts view strictly to 3 columns to match Facebook Stories patterns.
      */}
      <div className="grid grid-cols-3 md:flex md:flex-wrap gap-3 transition-all duration-500 ease-in-out">
        {visibleStories.map((asset) => {
          const isPositive = asset.change24h >= 0
          const meta = ASSET_METADATA_PRESETS[asset.symbol] || { logo: '/icons/generic.svg', name: asset.symbol }

          return (
            <div
              key={asset.symbol}
              onClick={() => router.push(`/market/${asset.symbol.toLowerCase()}`)}
              className="relative flex aspect-[3/4] md:w-[160px] md:h-[210px] flex-col justify-between rounded-2xl border border-slate-900 bg-slate-950/95 p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-slate-800/80 hover:scale-[1.02] cursor-pointer shadow-lg group overflow-hidden"
            >
              {/* Dynamic boundary flash background lighting pulses based on trajectory rules */}
              <div 
                className={`absolute inset-0 -z-10 opacity-5 transition-opacity duration-300 group-hover:opacity-10 ${
                  isPositive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`} 
              />

              {/* TOP HEADER ACCENT STRIP CARD ROW */}
              <div className="flex items-center justify-between w-full">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 relative">
                  <div className="text-xs font-black text-slate-300 font-mono">
                    {asset.symbol.slice(0, 2)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation() // Prevents opening the detail redirect link row on tap
                    onToggleWatchlist(asset.symbol)
                  }}
                  className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border transition-all duration-150 active:scale-90 ${
                    asset.isWatching
                      ? 'bg-amber-500 border-amber-600 text-slate-950'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Star className="h-3 w-3 fill-current" />
                </button>
              </div>

              {/* CENTER STAGE TRAJECTORY INDICATOR GRAPH METRICS */}
              <div className="flex flex-col py-1.5">
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-[#8DFF45]" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-[#FF5A5A]" />
                  )}
                  <span 
                    className="text-[10px] font-mono font-black tracking-wide"
                    style={{ color: isPositive ? '#8DFF45' : '#FF5A5A' }}
                  >
                    {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                  </span>
                </div>
                
                {/* Micro split progress tracker visual sentiment engine line */}
                <div className="mt-2 w-full h-1 rounded-full bg-slate-900 overflow-hidden flex">
                  <div className="h-full bg-[#8DFF45]" style={{ width: `${asset.bullishPercent}%` }} />
                  <div className="h-full bg-[#FF5A5A]" style={{ width: `${100 - asset.bullishPercent}%` }} />
                </div>
              </div>

              {/* BASE CORE QUANTITATIVE FOOTER BLOCK */}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {meta.name}
                </span>
                <span className="text-sm font-black font-mono text-slate-100 tracking-tight mt-0.5 whitespace-nowrap">
                  {formatPrice(asset.priceUsd, asset.symbol)}
                </span>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
