'use client'

import type { Timeframe } from '@/lib/market/ohlc'

interface TimeframeSelectorProps {
  selected: Timeframe
  onChange: (timeframe: Timeframe) => void
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M']

export default function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => onChange(timeframe)}
          className={`shrink-0 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            selected === timeframe
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900/40 text-slate-400 hover:bg-slate-900/60 hover:text-slate-300'
          }`}
        >
          {timeframe}
        </button>
      ))}
    </div>
  )
}
