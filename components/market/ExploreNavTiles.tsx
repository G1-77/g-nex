'use client'

import { CalendarDays, Newspaper, Star } from 'lucide-react'

export type ExploreNavTarget = 'news' | 'calendar' | 'watchlist'

interface ExploreNavTilesProps {
  onNavigate: (target: ExploreNavTarget) => void
}

const TILES: { target: ExploreNavTarget; label: string; icon: typeof Newspaper }[] = [
  { target: 'news', label: 'News', icon: Newspaper },
  { target: 'calendar', label: 'Calendar', icon: CalendarDays },
  { target: 'watchlist', label: 'Watchlist', icon: Star },
]

export default function ExploreNavTiles({ onNavigate }: ExploreNavTilesProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TILES.map((tile) => {
        const Icon = tile.icon

        return (
          <button
            key={tile.target}
            type="button"
            onClick={() => onNavigate(tile.target)}
            className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-slate-900/60 bg-slate-900/20 p-3 transition-all duration-200 hover:border-slate-700/60 hover:bg-slate-900/40 active:scale-95"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 transition-colors group-hover:border-slate-700">
              <Icon className="h-4 w-4 text-amber-400" />
            </span>
            <span className="text-xs font-bold text-slate-200">{tile.label}</span>
          </button>
        )
      })}
    </div>
  )
}