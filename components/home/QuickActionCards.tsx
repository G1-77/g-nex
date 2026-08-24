'use client'

// components/home/QuickActionCards.tsx
// Two-card quick action group: Deposit shortcut + live Favourite Asset card.
// The favourite card reuses the shared watchlist query and the cached market
// pipeline — it never computes its own prices. Multiple favourites rotate with
// a subtle crossfade; interaction pauses the rotation.

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDownToLine, Plus, Star } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import {
  useGetUserWatchlistQuery,
} from '@/lib/react-query/market/queries.market'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import SparklineArea from '@/components/market/SparklineArea'

const FAVOURITE_ROTATION_MS = 6000

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

function DepositCard() {
  return (
    <Link
      href="/wallet/deposit"
      className="gnex-card-elevated group flex cursor-pointer flex-col justify-between gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.99]"
      aria-label="Deposit funds into your wallet"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-bg">
          <ArrowDownToLine className="h-5 w-5 text-success" />
        </div>
        <p className="gnex-h3 text-text-primary">Deposit</p>
      </div>

      <div>
        <p className="text-caption text-text-muted">Fund your wallet via M-Pesa or Airtel</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-caption font-bold text-text-inverse transition-colors group-hover:bg-brand/90">
          Deposit now
        </span>
      </div>
    </Link>
  )
}

function FavouriteAssetCard() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { user } = useAuth()
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id ?? null)
  const { data: tickers = [] } = useMarketPrices()

  const favourites = useMemo(() => {
    const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))
    const rows = watchlistSymbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((t) => t !== undefined)

    // Priority: favourite → watchlist → sensible GNEX default (BTC). Never a
    // fabricated asset — BTC is part of the supported universe.
    if (rows.length > 0) return rows
    const btc = bySymbol.get('BTC')
    return btc ? [btc] : []
  }, [watchlistSymbols, tickers])

  // Derived clamp keeps the rotation valid if the watchlist shrinks.
  const safeIndex = Math.min(index, Math.max(0, favourites.length - 1))

  useEffect(() => {
    if (favourites.length <= 1 || paused || prefersReducedMotion) return
    const timer = setInterval(() => {
      setIndex((safeIndex + 1) % favourites.length)
    }, FAVOURITE_ROTATION_MS)
    return () => clearInterval(timer)
  }, [favourites.length, paused, prefersReducedMotion, safeIndex])

  const current = favourites[safeIndex]
  const isDefault = watchlistSymbols.length === 0
  const positive = current ? current.change24h >= 0 : true
  const color = positive ? '#8DFF45' : '#FF5A5A'

  return (
    <button
      type="button"
      onClick={() => current && router.push(`/markets/${current.symbol.toLowerCase()}`)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchMove={(e) => {
        if (touchStartX.current === null) {
          touchStartX.current = e.touches[0].clientX
          return
        }
        const deltaX = e.touches[0].clientX - touchStartX.current
        if (Math.abs(deltaX) > 40 && favourites.length > 1) {
          setIndex((safeIndex + (deltaX > 0 ? -1 : 1) + favourites.length) % favourites.length)
          touchStartX.current = e.touches[0].clientX
        }
      }}
      onTouchCancel={() => {
        touchStartX.current = null
        setPaused(false)
      }}
      disabled={!current}
      aria-label={
        current
          ? `View ${current.name} market details`
          : 'Favourite asset loading'
      }
      className="gnex-card-elevated flex cursor-pointer flex-col justify-between gap-3 p-4 text-left transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.99] disabled:animate-pulse"
    >
      {current && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image src={current.logo} alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-body-sm font-bold text-text-primary">{current.symbol}</p>
                <p className="truncate font-mono text-caption text-text-muted">{formatPrice(current.priceUsd)}</p>
              </div>
            </div>

            <span
              className="shrink-0 rounded-md px-2 py-0.5 font-mono text-caption font-black tabular-nums"
              style={{ color, backgroundColor: `${color}0f` }}
            >
              {positive ? '+' : ''}
              {current.change24h.toFixed(2)}%
            </span>
          </div>

          <div className="h-8 w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.symbol}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="h-full w-full"
              >
                <SparklineArea data={current.sparkline} color={color} height={32} className="h-full w-full" />
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="flex items-center gap-1.5 text-caption text-text-muted">
            <Star className={`h-3 w-3 ${isDefault ? '' : 'fill-brand text-brand'}`} />
            {isDefault ? (
              <span className="truncate">Star assets to feature here</span>
            ) : (
              <span className="truncate">
                Your favourite{favourites.length > 1 ? ` · ${safeIndex + 1}/${favourites.length}` : ''}
              </span>
            )}
            {!isDefault && favourites.length <= 1 && <Plus className="h-3 w-3" aria-hidden="true" />}
          </p>
        </>
      )}
    </button>
  )
}

export default function QuickActionCards() {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-2 gap-3">
      <DepositCard />
      <FavouriteAssetCard />
    </section>
  )
}
