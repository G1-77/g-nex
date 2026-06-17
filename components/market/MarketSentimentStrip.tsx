'use client'

import { MarketTicker } from '@/lib/supabase/market.types'
import { BarChart2, } from 'lucide-react'

interface MarketSentimentStripProps {
  tickers: MarketTicker[]
}

export default function MarketSentimentStrip({ tickers }: MarketSentimentStripProps) {
  // SVG Ring Constants for our geometry calculations
  const RADIUS = 28
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  return (
    <div className="rounded-2xl bg-slate-900/10 p-5 backdrop-blur-xl space-y-4 shadow-lg select-none">
      
      {/* Header Container */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">
          <BarChart2 className="h-4 w-4 text-amber-500" />
          <span>Community Sentiment Rings</span>
        </div>
        <span className="text-[9px] bg-white/2 text-slate-500 border border-white/4 px-2 py-0.5 rounded font-mono">
          Live Consensus
        </span>
      </div>

      {/* 6-Column High-Density Circle Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full pt-1">
        {tickers.slice(0, 6).map((asset) => {
          const isBullishDominant = asset.bullishPercent >= 50
          
          // Calculate exact stroke offsets dynamically based on the bullish percentages
          const strokeOffset = CIRCUMFERENCE - (asset.bullishPercent / 100) * CIRCUMFERENCE

          return (
            <div 
              key={asset.symbol} 
              className="bg-slate-900/40 border border-white/2 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 hover:border-white/6 transition-all duration-200"
            >
              {/* Specialized Pure SVG Pie/Donut Sentiment Ring */}
              <div className="relative h-16 w-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                  {/* Underlay Base Circle (Bearish Color Background Track) */}
                  <circle
                    cx="32"
                    cy="32"
                    r={RADIUS}
                    className="stroke-[#FF5A5A]"
                    strokeWidth="4.5"
                    fill="transparent"
                    strokeOpacity="0.1"
                  />
                  {/* Active Foreground Progress Arc (Bullish Path Layer) */}
                  <circle
                    cx="32"
                    cy="32"
                    r={RADIUS}
                    className="transition-all duration-700 ease-out"
                    strokeWidth="4.5"
                    fill="transparent"
                    strokeLinecap="round"
                    style={{
                      stroke: isBullishDominant ? '#8DFF45' : '#FF5A5A',
                      strokeDasharray: CIRCUMFERENCE,
                      strokeDashoffset: strokeOffset,
                      filter: `drop-shadow(0 0 4px ${isBullishDominant ? 'rgba(141,255,73,0.3)' : 'rgba(255,90,90,0.3)'})`
                    }}
                  />
                </svg>

                {/* Centered Typography Reading Index Metrics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                  <span className="text-[11px] font-black text-slate-100 tracking-tighter">
                    {asset.bullishPercent}%
                  </span>
                </div>
              </div>

              {/* Base Metadata Descriptions Row */}
              <div className="flex flex-col items-center text-center">
                <span className="font-mono text-xs font-black text-slate-200 tracking-wide">
                  {asset.symbol}
                </span>
                <span 
                  className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
                  style={{ color: isBullishDominant ? '#8DFF45' : '#FF5A5A' }}
                >
                  {isBullishDominant ? 'Bullish' : 'Bearish'}
                </span>
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}
