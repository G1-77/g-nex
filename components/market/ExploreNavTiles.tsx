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
            className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 gnex-interactive gnex-touch-target"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface/40 transition-colors group-hover:bg-surface-hover">
              <Icon className="h-4 w-4 text-brand" />
            </span>
            <span className="text-caption font-bold text-text-primary">{tile.label}</span>
          </button>
        )
      })}
    </div>
  )
}