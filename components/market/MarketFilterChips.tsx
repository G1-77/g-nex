'use client'

import type { MarketFilterChipsProps, MarketFilterType } from '@/lib/supabase/market.types'

const CHIP_OPTIONS: MarketFilterType[] = ['All', 'Crypto', 'Gold', 'Watchlist']

export default function MarketFilterChips({
  activeFilter,
  onFilterChange,
}: MarketFilterChipsProps) {
  return (
    <div className="w-full select-none">
      <div className="flex overflow-x-auto gap-2 py-2 scrollbar-none snap-x mask-image-horizontal">
        {CHIP_OPTIONS.map((filter) => {
          const isSelected = activeFilter === filter

          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`snap-center shrink-0 cursor-pointer rounded-full px-5 py-1.5 text-xs font-bold tracking-wide uppercase border transition-all duration-150 active:scale-95 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm shadow-amber-500/10 font-black'
                  : 'bg-slate-900/40 text-slate-400 border-slate-900 hover:border-slate-800 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          )
        })}
      </div>
    </div>
  )
}
