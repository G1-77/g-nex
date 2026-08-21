'use client'

import type { Timeframe } from '@/lib/market/ohlc'
import { CRYPTO_TIMEFRAMES } from '@/lib/market/ohlc'

interface TimeframeSelectorProps {
  selected: Timeframe
  onChange: (timeframe: Timeframe) => void
  /** Restrict the offered set (e.g. gold only serves daily bars). */
  timeframes?: Timeframe[]
}

export default function TimeframeSelector({ selected, onChange, timeframes = CRYPTO_TIMEFRAMES }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe}
          type="button"
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
