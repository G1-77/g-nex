'use client'

import { MarketTicker } from '@/lib/supabase/market.types'
import { Flame } from 'lucide-react'

interface MarketSentimentStripProps {
  tickers: MarketTicker[]
}

export default function MarketSentimentStrip({ tickers }: MarketSentimentStripProps) {
  return (
    <div className="rounded-2xl border border-slate-900/80 bg-slate-900/30 p-4 backdrop-blur-xl space-y-3.5 shadow-xl">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 select-none">
        <Flame className="h-3.5 w-3.5 text-orange-500" />
        <span>Immediate Sentiment Consensus Matrix</span>
      </div>
      <div className="space-y-2.5">
        {tickers.slice(0, 3).map((asset) => (
          <div key={asset.symbol} className="flex flex-col text-xs font-mono font-bold">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span className="font-sans font-bold text-slate-400">{asset.symbol}/USD Core bias</span>
              <span className="text-[#8DFF45] font-black">{asset.bullishPercent}% Bullish</span>
            </div>
            <div className="mt-1.5 w-full h-1.5 rounded-full bg-slate-950 overflow-hidden flex border border-slate-900/50">
              <div className="h-full bg-[#8DFF45] transition-all duration-500" style={{ width: `${asset.bullishPercent}%` }} />
              <div className="h-full bg-[#FF5A5A] transition-all duration-500" style={{ width: `${100 - asset.bullishPercent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
