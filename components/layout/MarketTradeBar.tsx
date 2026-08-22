'use client'

import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import {
  useGetUserWatchlistQuery,
  useToggleWatchlistMutation,
} from '@/lib/react-query/market/queries.market'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useFocusedAsset } from '@/lib/store/focused-asset'

export default function MarketTradeBar() {
  const router = useRouter()
  const { user } = useAuth()
  const focused = useFocusedAsset()
  const toggleWatchlist = useToggleWatchlistMutation()

  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id || null)
  const { data: tickers } = useMarketPrices(watchlistSymbols)

  const ticker = tickers?.find((t) => t.symbol === focused)
  const isPositive = (ticker?.change24h ?? 0) >= 0
  const isWatching = ticker?.isWatching ?? false

  const handleTrade = (side: 'BUY' | 'SELL') => {
    router.push(`/markets/${focused.toLowerCase()}/trade?side=${side.toLowerCase()}`)
  }

  const handleToggleWatch = () => {
    if (!user) {
      alert('Please sign in to manage your watchlist')
      return
    }
    toggleWatchlist.mutate({ userId: user.id, symbol: focused })
  }

  return (
    <div className="flex h-16 items-center justify-between gap-3 px-page">
      <button
        type="button"
        onClick={() => router.push(`/markets/${focused.toLowerCase()}`)}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left gnex-touch-target"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand font-mono text-caption font-black text-text-inverse">
          {focused}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-body-sm font-black text-text-primary">
            {ticker?.name ?? focused}
          </span>
          <span className="font-mono text-caption font-black" style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {ticker
              ? `$${ticker.priceUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} · ${isPositive ? '+' : ''}${ticker.change24h.toFixed(2)}%`
              : '—'}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleToggleWatch}
          aria-label="Toggle watchlist"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-surface-hover gnex-touch-target"
        >
          <Star
            className={`h-4 w-4 ${isWatching ? 'fill-amber-500 text-amber-500' : 'text-text-muted'}`}
          />
        </button>

        <button
          type="button"
          onClick={() => handleTrade('BUY')}
          className="cursor-pointer rounded-lg border border-success-border bg-success-bg px-4 py-2 font-mono text-caption font-black uppercase tracking-wider text-success transition-all hover:bg-success-bg/20 active:scale-95 gnex-touch-target"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => handleTrade('SELL')}
          className="cursor-pointer rounded-lg border border-danger-border bg-danger-bg px-4 py-2 font-mono text-caption font-black uppercase tracking-wider text-danger transition-all hover:bg-danger-bg/20 active:scale-95 gnex-touch-target"
        >
          Sell
        </button>
      </div>
    </div>
  )
}