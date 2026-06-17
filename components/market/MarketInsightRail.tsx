'use client'

import { VerifiedTraderAllocation } from '@/lib/supabase/market.types'
import { Award, Activity, ShieldAlert } from 'lucide-react'

interface MarketInsightsRailProps {
  traders: VerifiedTraderAllocation[]
}

export default function MarketInsightsRail({ traders }: MarketInsightsRailProps) {
  return (
    <div className="hidden lg:flex flex-col w-72 shrink-0 space-y-4 sticky top-16 h-fit max-h-[calc(100vh-5rem)] overflow-y-auto select-none pr-1 scrollbar-none z-20">
      
      {/* SECTION 6 — VERIFIED SOCIAL PROOF LAYER CONTAINER */}
      <div className="rounded-2xl border border-slate-900/80 bg-slate-900/30 p-4 shadow-xl space-y-3 backdrop-blur-xl">
        <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-slate-400">
          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-500" />
            <span>Top Traders (30D ROI)</span>
          </div>
          <span className="text-[9px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">View All</span>
        </div>
        <div className="space-y-2">
          {traders.map((trader) => (
            <div key={trader.id} className="flex flex-col text-xs font-mono font-bold bg-slate-950/50 border border-slate-900/80 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-sans">@{trader.username}</span>
                <span className="text-[#8DFF45] font-black">+{trader.monthlyRoi}%</span>
              </div>
              <div className="text-[9px] text-slate-500 font-sans font-medium mt-1 uppercase tracking-wider">
                {trader.allocationPercent}% {trader.primaryAsset} Weight
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5 — COMPACT MARKET MOVERS INDEX */}
      <div className="rounded-2xl border border-slate-900/80 bg-slate-900/30 p-4 shadow-xl space-y-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-slate-400">
          <Activity className="h-4 w-4 text-amber-500" />
          <span>Market Movers</span>
        </div>
        <div className="flex flex-col gap-1.5 font-mono text-xs font-bold">
          <div className="flex justify-between bg-slate-950/40 border border-slate-900/50 rounded-lg px-3 py-1.5">
            <span className="text-slate-300 font-sans">SOL Momentum</span>
            <span className="text-[#8DFF45]">+8.41%</span>
          </div>
          <div className="flex justify-between bg-slate-950/40 border border-slate-900/50 rounded-lg px-3 py-1.5">
            <span className="text-slate-300 font-sans">XRP Momentum</span>
            <span className="text-[#8DFF45]">+4.20%</span>
          </div>
        </div>
      </div>

      {/* COMPACT MACRO CALENDAR RISK STATUS BOX */}
      <div className="rounded-2xl border border-slate-900/80 bg-slate-950/80 p-3.5 shadow-xl flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Macro Alert</span>
          <span className="text-slate-200 font-bold mt-0.5 text-xs truncate">US CPI Print in 01h 42m</span>
        </div>
      </div>

    </div>
  )
}
