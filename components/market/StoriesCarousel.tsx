'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Star, TrendingUp, TrendingDown } from 'lucide-react'
import { StoriesCarouselProps } from '@/lib/supabase/market.types'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'

export default function StoriesCarousel({ tickers, onToggleWatchlist }: StoriesCarouselProps) {
  const router = useRouter()
  const [startIndex, setStartIndex] = useState(0)

  // 🟢 AUTOMATED 8-SECOND PROGRESSIVE CONTINUOUS CAROUSEL CYCLE
  useEffect(() => {
    if (tickers.length <= 3) return

    const interval = setInterval(() => {
      setStartIndex((prev) => {
        // Step forward by 1 card index position cleanly, or loop back to index zero
        return (prev + 1) % (tickers.length - 2)
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [tickers.length])

  // Extract exactly three moving assets for the active view frame snapshot
  const visibleTickers = useMemo(() => {
    if (tickers.length <= 3) return tickers
    return tickers.slice(startIndex, startIndex + 3)
  }, [tickers, startIndex])

  const formatPrice = (price: number, symbol: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: symbol === 'XAU' || symbol === 'USDT' || symbol === 'XRP' ? 2 : 0,
    }).format(price)
  }

  return (
    <div className="w-full select-none relative overflow-hidden py-1">
      {/* Responsive layout: Desktop maps all panels, Mobile restricts viewport tightly to 3 columns */}
      <div className="grid grid-cols-3 md:flex md:flex-wrap gap-3 transition-all duration-500 ease-in-out">
        {visibleTickers.map((ticker) => {
          const isPositive = ticker.change24h >= 0
          const meta = MARKET_ASSETS[ticker.symbol] || { name: ticker.symbol }

          // 🎨 Visual Rules Matrix assignment
          let glowColor = isPositive ? 'rgba(141,255,73,0.04)' : 'rgba(255,90,90,0.04)'
          if (ticker.symbol === 'XAU') {
            glowColor = 'rgba(245,158,11,0.04)' // Premium Amber Glow token for Gold
          }

          return (
            <div
              key={ticker.symbol}
              onClick={() => router.push(`/market/${ticker.symbol.toLowerCase()}`)}
              className="relative flex aspect-[3/4] md:w-[160px] md:h-[210px] flex-col justify-between rounded-2xl border border-slate-900 bg-slate-950/95 p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-slate-800/80 hover:scale-[1.01] cursor-pointer shadow-xl group overflow-hidden"
              style={{ boxShadow: `inset 0 0 20px ${glowColor}` }}
            >
              {/* Dynamic background container lighting pulses based on trajectory rules */}
              <div 
                className={`absolute inset-0 -z-10 opacity-30 transition-opacity duration-300 group-hover:opacity-50 ${
                  ticker.symbol === 'XAU' ? 'bg-amber-500/5' : isPositive ? 'bg-emerald-500/5 animate-pulse' : 'bg-rose-500/5'
                }`} 
              />

              {/* TOP STRIP ACCENT HEADER CELL */}
              <div className="flex items-center justify-between w-full">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs font-black text-slate-300">
                  {ticker.symbol.slice(0, 2)}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation() // Prevents opening the dynamic subpage page redirect link on tap
                    onToggleWatchlist(ticker.symbol)
                  }}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-150 active:scale-90 cursor-pointer ${
                    ticker.isWatching
                      ? 'bg-amber-500 border-amber-600 text-slate-950'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Star className="h-3 w-3 fill-current" />
                </button>
              </div>

              {/* CENTER STAGE PERCENT TRAJECTORY GAUGES */}
              <div className="flex flex-col py-1">
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
                    {isPositive ? '+' : ''}{ticker.change24h.toFixed(2)}%
                  </span>
                </div>
                
                {/* Horizontal progress split bar consensus tracking */}
                <div className="mt-2 w-full h-1 rounded-full bg-slate-900 overflow-hidden flex">
                  <div className="h-full" style={{ width: `${ticker.bullishPercent}%`, backgroundColor: '#8DFF45' }} />
                  <div className="h-full" style={{ width: `${100 - ticker.bullishPercent}%`, backgroundColor: '#FF5A5A' }} />
                </div>
              </div>

              {/* BASE CORE QUANTITATIVE VALUES BLOCK */}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {meta.name}
                </span>
                <span className="text-sm font-black font-mono text-slate-100 tracking-tight mt-0.5 whitespace-nowrap">
                  {formatPrice(ticker.priceUsd, ticker.symbol)}
                </span>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
