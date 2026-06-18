'use client'

import { useState } from 'react'
import { Award, Activity, MessageSquare, ThumbsUp } from 'lucide-react'
import type { VerifiedTraderAllocation } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

interface SocialSignalsGridProps {
  symbol: AssetSymbol
  bullishPercent: number
  traders: VerifiedTraderAllocation[]
}

type MoversTab = 'Gainers' | 'Losers' | 'Trending'

export default function SocialSignalsGrid({ symbol, bullishPercent, traders }: SocialSignalsGridProps) {
  const [activeTab, setActiveTab] = useState<MoversTab>('Gainers')
  const bearishPercent = 100 - bullishPercent

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 select-none text-slate-100">
      
      {/* CARD 1: COMMUNITY SENTIMENT CONTAINER */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 backdrop-blur-xl flex flex-col justify-between h-44 shadow-lg">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
          <span>Community Sentiment</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between font-mono font-black">
            <span className="text-2xl text-[#8DFF45] tracking-tight">{bullishPercent}% <span className="text-[10px] font-sans text-slate-500 uppercase font-medium">Bullish</span></span>
            <span className="text-xs text-[#FF5A5A]">{bearishPercent}% <span className="text-[9px] font-sans text-slate-500 uppercase font-medium">Bearish</span></span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
            <div className="h-full bg-[#8DFF45]" style={{ width: `${bullishPercent}%` }} />
            <div className="h-full bg-[#FF5A5A]" style={{ width: `${bearishPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-sans font-medium">
          <div className="flex -space-x-1.5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-4 rounded-full bg-slate-800 border border-slate-950 flex items-center justify-center text-[7px] font-black font-mono text-slate-400">U</div>
            ))}
          </div>
          <span>Based on 24,543 active setups</span>
        </div>
      </div>

      {/* CARD 2: TOP VERIFIED TRADERS */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 backdrop-blur-xl flex flex-col justify-between h-44 shadow-lg">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          <Award className="h-4 w-4 text-amber-500" />
          <span>Top Verified Traders</span>
        </div>

        <div className="space-y-1.5 flex-1 mt-2.5">
          {traders.slice(0, 2).map((trader) => (
            <div key={trader.id} className="flex items-center justify-between text-xs font-mono font-bold bg-slate-900/20 border border-white/[0.01] rounded-xl px-2.5 py-1.5">
              <span className="text-slate-300 font-sans">@{trader.username}</span>
              <span className="text-[#8DFF45] font-black">+{trader.monthlyRoi}%</span>
            </div>
          ))}
        </div>

        <button type="button" className="w-full text-center text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 cursor-pointer pt-1 border-t border-slate-900/40 bg-transparent border-none">
          View All Traders
        </button>
      </div>

      {/* CARD 3: MARKET MOVERS TABS PANEL */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 backdrop-blur-xl flex flex-col justify-between h-44 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-900/60 pb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            <span>Market Movers</span>
          </div>

          <div className="flex gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-900">
            {(['Gainers', 'Losers'] as MoversTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border-none ${
                  activeTab === tab ? 'bg-slate-900 text-slate-200' : 'text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 font-mono text-xs font-bold flex-1 justify-center">
          <div className="flex justify-between bg-slate-900/10 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-300 font-sans">SOL</span>
            <span className="text-[#8DFF45]">+8.62%</span>
          </div>
          <div className="flex justify-between bg-slate-900/10 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-300 font-sans">ETH</span>
            <span className="text-[#8DFF45]">+6.25%</span>
          </div>
        </div>
      </div>

    </div>
  )
}
