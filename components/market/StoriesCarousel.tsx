'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, TrendingUp, TrendingDown } from 'lucide-react'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import { StoriesCarouselProps } from '@/lib/supabase/market.types'

export default function StoriesCarousel({ tickers = [], onToggleWatchlist, onActionClick }: StoriesCarouselProps) {
  const router = useRouter()
  const [startIndex, setStartIndex] = useState(0)
  const totalCount = tickers.length

  useEffect(() => {
    if (totalCount <= 3) return
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % (totalCount - 2))
    }, 8000)
    return () => clearInterval(interval)
  }, [totalCount])

  const visibleTickers = useMemo(() => {
    if (totalCount <= 3) return tickers
    return tickers.slice(startIndex, startIndex + 3)
  }, [tickers, startIndex, totalCount])

  return (
    <div className="w-full relative overflow-hidden">
      <div className="grid grid-cols-3 gap-4 w-full items-stretch">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleTickers.map((ticker) => {
            const isPositive = ticker.change24h >= 0
            const meta = MARKET_ASSETS[ticker.symbol] || { name: ticker.symbol }

            let glowColor = isPositive ? 'rgba(141,255,73,0.05)' : 'rgba(255,90,90,0.05)'
            if (ticker.symbol === 'XAU') glowColor = 'rgba(245,158,11,0.05)'

            return (
              <motion.div
                key={ticker.symbol}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                whileHover={{ y: -4 }}
                onClick={() => router.push(`/market/${ticker.symbol.toLowerCase()}`)}
                className="relative flex min-h-[220px] w-full flex-col justify-between rounded-3xl border border-slate-900/60 bg-slate-950/40 p-4 backdrop-blur-xl transition-shadow duration-300 cursor-pointer group"
                style={{ boxShadow: `0 10px 30px -10px rgba(0,0,0,0.7), inset 0 0 20px ${glowColor}` }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-slate-900 flex items-center justify-center font-mono text-[10px] font-black text-slate-300 border border-slate-800">
                      {ticker.symbol.slice(0, 2)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono hidden md:inline">
                      {ticker.symbol}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleWatchlist(ticker.symbol)
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                      ticker.isWatching ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </button>
                </div>

                <div className="flex flex-col py-1">
                  <div className="flex items-center gap-1">
                    {isPositive ? <TrendingUp className="h-3.5 w-3.5 text-[#8DFF45]" /> : <TrendingDown className="h-3.5 w-3.5 text-[#FF5A5A]" />}
                    <span className="text-xs font-mono font-black" style={{ color: isPositive ? '#8DFF45' : '#FF5A5A' }}>
                      {isPositive ? '+' : ''}{ticker.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full h-1 rounded-full bg-slate-900/80 overflow-hidden flex">
                    <div className="h-full transition-all duration-500" style={{ width: `${ticker.bullishPercent}%`, backgroundColor: '#8DFF45' }} />
                    <div className="h-full transition-all duration-500" style={{ width: `${100 - ticker.bullishPercent}%`, backgroundColor: '#FF5A5A' }} />
                  </div>
                </div>

                <div className="flex flex-col min-w-0 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{meta.name}</span>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm md:text-base font-black font-mono text-slate-100 tracking-tight whitespace-nowrap">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: ticker.symbol === 'SOL' ? 2 : 0 }).format(ticker.priceUsd)}
                    </span>
                  </div>
                  <div className="pt-2 hidden md:flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onActionClick(ticker.symbol, 'BUY')}
                      className="px-3 py-1 bg-emerald-500 text-slate-950 font-black font-mono text-[9px] uppercase tracking-wider rounded-md active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                    >
                      Buy
                    </button>
                    <span className="text-[9px] font-mono text-slate-600">{ticker.watcherCount} watching</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
