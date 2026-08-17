'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { AssetSymbol } from '@/lib/supabase/types'

interface SentimentBarProps {
  symbol: AssetSymbol
}

async function calculateSentiment(symbol: AssetSymbol): Promise<{ bullish: number; bearish: number; total: number }> {
  // Get sentiment from user positions
  const { data: positions, error: posError } = await supabase
    .from('user_positions')
    .select('direction')
    .eq('asset_symbol', symbol)
    .eq('status', 'OPEN')

  if (posError) {
    console.error('Error fetching positions:', posError)
  }

  // Get sentiment from trade tags
  const { data: tags, error: tagError } = await supabase
    .from('trade_tags')
    .select('signal_type, direction')
    .eq('asset_symbol', symbol)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

  if (tagError) {
    console.error('Error fetching tags:', tagError)
  }

  let bullishCount = 0
  let bearishCount = 0

  // Count from positions
  if (positions) {
    positions.forEach(p => {
      if (p.direction === 'Long') bullishCount++
      else if (p.direction === 'Short') bearishCount++
    })
  }

  // Count from trade tags
  if (tags) {
    tags.forEach(t => {
      if (t.direction === 'bullish' || t.signal_type === 'Bullish') bullishCount++
      else if (t.direction === 'bearish' || t.signal_type === 'Bearish') bearishCount++
    })
  }

  const total = bullishCount + bearishCount
  
  // If no data, return neutral
  if (total === 0) {
    return { bullish: 50, bearish: 50, total: 0 }
  }

  const bullishPercent = Math.round((bullishCount / total) * 100)
  const bearishPercent = 100 - bullishPercent

  return { bullish: bullishPercent, bearish: bearishPercent, total }
}

export default function SentimentBar({ symbol }: SentimentBarProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['sentiment', symbol],
    queryFn: () => calculateSentiment(symbol),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-32 mb-2" />
        <div className="h-2 bg-slate-800 rounded" />
      </div>
    )
  }

  const { bullish = 50, bearish = 50, total = 0 } = data || {}

  return (
    <div className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-bold text-slate-300">Market Activity</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {total > 0 ? `${total} signals` : 'No data yet'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono font-bold">
          <span className="text-emerald-400">{bullish}% Bullish</span>
          <span className="text-rose-400">{bearish}% Bearish</span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-900/80 overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${bullish}%` }}
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${bearish}%` }}
          />
        </div>

        {total === 0 && (
          <p className="text-[10px] text-slate-500 text-center mt-2">
            Based on user positions and trade signals
          </p>
        )}
      </div>
    </div>
  )
}
