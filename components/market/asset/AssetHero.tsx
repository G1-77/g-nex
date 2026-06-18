'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Star, Share2, } from 'lucide-react'
import type { AssetHeroProps } from '@/lib/supabase/market.types'

export default function AssetHero({ asset, onToggleWatchlist }: AssetHeroProps) {
  const router = useRouter()
  const isPositive = asset.change24h >= 0

  const formatUSD = (val: number, isCompact = false) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: isCompact ? 'compact' : 'standard',
      maximumFractionDigits: val < 1 ? 4 : 2
    }).format(val)
  }

  return (
    <div className="w-full flex flex-col space-y-4 select-none animate-fadeIn text-slate-100">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/market')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer border-none bg-transparent"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Markets</span>
        </button>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/40 border border-white/2 px-2.5 py-1 rounded-lg">
            <span className="text-slate-200 font-bold">12,452</span>
            <span className="text-[10px] text-slate-500 uppercase font-sans tracking-wider">watching now</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-lg font-sans font-bold text-[10px] uppercase tracking-wider">
            +99 Signals
          </div>
          <button
            type="button"
            onClick={() => onToggleWatchlist(asset.symbol)}
            className="flex items-center gap-1 text-slate-400 hover:text-amber-500 transition-colors"
          >
            <Star className={`h-4 w-4 ${asset.isWatching ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span className="text-[10px] font-bold font-sans uppercase tracking-wider hidden sm:inline">Watchlist</span>
          </button>
        </div>
      </div>

      {/* Asset Identifier & Core Ticker Line */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-amber-500 font-mono text-xs font-black text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/10">
            {asset.symbol.slice(0, 1)}
          </div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xl font-black font-sans tracking-tight text-slate-100">{asset.name}</h1>
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">{asset.symbol}/USD</span>
            <button type="button" className="text-slate-600 hover:text-slate-400 p-1"><Share2 className="h-3 w-3" /></button>
          </div>
        </div>

        {/* Real-Time Price Row */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-black font-mono tracking-tight text-slate-100">
            {formatUSD(asset.priceUsd)}
          </span>
          <span 
            className="text-xs font-mono font-black"
            style={{ color: isPositive ? '#8DFF45' : '#FF5A5A' }}
          >
            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}% (24h)
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
            Market Open
          </span>
        </div>
      </div>

      {/* Institutional Metadata Metrics Strip (From Mockup) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full pt-1 border-t border-slate-900/60">
        {[
          { label: 'Market Cap', val: formatUSD(asset.marketCapUsd, true) },
          { label: 'Volume (24h)', val: formatUSD(asset.volume24h, true) },
          { label: '24h High', val: formatUSD(asset.priceUsd * 1.024) },
          { label: '24h Low', val: formatUSD(asset.priceUsd * 0.981) },
          { label: 'Circulating Supply', val: asset.symbol === 'BTC' ? '19.68M BTC' : 'Dynamic supply active' }
        ].map((item) => (
          <div key={item.label} className="flex flex-col p-1 font-mono">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-sans">{item.label}</span>
            <span className="text-xs font-black text-slate-200 mt-0.5">{item.val}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
