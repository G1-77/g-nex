"use client"

import type { MarketMover } from "@/lib/supabase/market.types"
import { AssetSymbol } from "@/lib/supabase/types"
import { Activity } from "lucide-react"
import { useState } from "react"

type MoversFilter = "GAINERS" | "LOSERS" | "TRENDING"

const MOCK_MOVERS_POOL: Record<MoversFilter, MarketMover[]> = {
  GAINERS: [
    { symbol: "SOL" as AssetSymbol, priceUsd: 165.34, change24h: 8.62, volume24h: 2500000000, type: "gainer" },
    { symbol: "XRP" as AssetSymbol, priceUsd: 0.58, change24h: 4.2, volume24h: 1800000000, type: "gainer" }
  ],
  LOSERS: [
    { symbol: "ETH" as AssetSymbol, priceUsd: 3870.21, change24h: -1.85, volume24h: 18000000000, type: "loser" },
    { symbol: "XAU" as AssetSymbol, priceUsd: 2432.10, change24h: -0.3, volume24h: 500000000, type: "loser" }
  ], 
  TRENDING: [
    { symbol: "BTC" as AssetSymbol, priceUsd: 72450.22, change24h: 4.82, volume24h: 45000000000, type: "gainer" }, 
    { symbol: "SOL" as AssetSymbol, priceUsd: 165.34, change24h: 8.62, volume24h: 2500000000, type: "gainer" }
  ], 
}

export default function MarketMover() {
  const [activeTab, setActiveTab] = useState<MoversFilter>("GAINERS")
  const currentMovers = MOCK_MOVERS_POOL[activeTab]

  return (
    <div className="w-full bg-slate-950 border border-slate-900 rounded-2xl p-4 backdrop-blur-xl space-y-4 shadow-xl select-none animate-fadeIn text-slate-100">

    {/**Tab Filter Header Control Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/60 pb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          <Activity className="h-4 w-4 text-amber-500" />
          <span>Market Movers</span>
        </div>
      {/**Tab Selector Options Bar */}

      </div>

    </div>
  )
}