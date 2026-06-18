'use client'

import { Flame } from 'lucide-react'
import type { SentimentMeterProps } from '@/lib/supabase/market.types'

export default function SentimentMeter({ symbol, bullishPercent }: SentimentMeterProps) {
  const sanitizedBullish = Math.min(Math.max(bullishPercent, 0), 100)
  const bearishPercent = 100 - sanitizedBullish
  const isBullishDominant = sanitizedBullish >= 50

  const RADIUS = 50
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const bullishOffset = CIRCUMFERENCE - (sanitizedBullish / 100) * CIRCUMFERENCE

  return (
    <div className="w-full bg-slate-900/10 border border-white/2 rounded-3xl p-6 backdrop-blur-xl space-y-5 shadow-xl select-none animate-fadeIn">
      
      <div className="flex items-center justify-between border-b border-white/2 pb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
          <span>Crowdsourced Momentum Consensus</span>
        </div>
        <span className="text-[9px] bg-slate-950 text-slate-500 px-2 py-0.5 rounded border border-slate-900 font-mono font-bold">
          {symbol}/USD Alpha
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2 w-full">
        
        {/* Dynamic Dual-Arc SVG Sentiment Wheel Ring Container */}
        <div className="relative h-32 w-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              className="stroke-[#FF5A5A]"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              className="transition-all duration-1000 ease-out"
              strokeWidth="7"
              fill="transparent"
              strokeLinecap="round"
              style={{
                stroke: '#8DFF45',
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: bullishOffset,
                filter: `drop-shadow(0 0 6px ${isBullishDominant ? 'rgba(141,255,73,0.3)' : 'rgba(255,90,90,0.1)'})`
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
            <span className="text-xl font-black text-slate-100 tracking-tighter">
              {sanitizedBullish}%
            </span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
              Bullish
            </span>
          </div>
        </div>

        {/* Data breakdown legend cards list */}
        <div className="flex-1 space-y-4 max-w-sm w-full font-mono">
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-sans">Buyer Bias</span>
              <span className="text-base font-black text-[#8DFF45] mt-1">{sanitizedBullish}%</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-sans">Seller Bias</span>
              <span className="text-base font-black text-[#FF5A5A] mt-1">{bearishPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-sans font-medium leading-relaxed normal-case">
            Derived in real-time from active trade setups, high-conviction feed streams, and crowdsourced community positioning metrics matching the {symbol} instrument.
          </p>
        </div>

      </div>
    </div>
  )
}
