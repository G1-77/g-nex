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
    <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/90 px-4 backdrop-blur-md md:-mx-6 md:px-6">
      <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-caption font-bold tracking-wide transition-all duration-150 active:scale-95 gnex-touch-target gnex-interactive ${
                active
                  ? 'bg-brand text-text-inverse shadow-sm shadow-brand/10'
                  : 'bg-surface/40 text-text-muted hover:bg-surface-hover hover:text-text-primary'
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