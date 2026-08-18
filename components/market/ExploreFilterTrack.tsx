'use client'

import type { MarketFilterType } from '@/lib/supabase/market.types'

interface ExploreFilterTrackProps {
  activeFilter: MarketFilterType
  onFilterChange: (filter: MarketFilterType) => void
}

const FILTERS: { id: MarketFilterType; label: string }[] = [
  { id: 'All', label: 'Overview' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'Gold', label: 'Gold' },
  { id: 'Watchlist', label: 'Watchlist' },
]

export default function ExploreFilterTrack({
  activeFilter,
  onFilterChange,
}: ExploreFilterTrackProps) {
  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-slate-900/60 bg-slate-950/90 px-4 backdrop-blur-md md:-mx-6 md:px-6">
      <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide transition-all duration-150 active:scale-95 ${
                active
                  ? 'border-amber-500/30 bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/10'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}