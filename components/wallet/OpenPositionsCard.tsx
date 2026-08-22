'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { TrendingDown, TrendingUp, X } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import { useGetUserPositionsQuery } from '@/lib/react-query/queries/positions.queries'
import { useClosePositionMutation } from '@/lib/react-query/queries/orders.queries'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useUsdKesRate } from '@/lib/react-query/market/queries.market'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import { formatKes, formatUnits, formatUsd } from '@/lib/market/wallet-utils'
import type { PositionRow } from '@/lib/supabase/market.types'

function PositionPnl({ position }: { position: PositionRow }) {
  const { data: tickers = [] } = useMarketPrices([position.assetSymbol])
  const { data: usdKes = 130 } = useUsdKesRate()

  const priceUsd = tickers.find((t) => t.symbol === position.assetSymbol)?.priceUsd ?? 0
  const pnlUsd =
    priceUsd > 0
      ? (priceUsd - position.entryPriceUsd) *
        position.units *
        (position.direction === 'Long' ? 1 : -1)
      : 0
  const pnlKes = pnlUsd * usdKes
  const pct = position.entryPriceUsd > 0 ? (pnlUsd / position.marginKes) * usdKes : 0

  const positive = pnlKes >= 0

  return (
    <div className="text-right">
      <p className={`font-mono text-body-sm font-black ${positive ? 'text-success' : 'text-danger'}`}>
        {positive ? '+' : ''}
        {formatKes(pnlKes)}
      </p>
      <p className={`mt-0.5 font-mono text-caption ${positive ? 'text-success/70' : 'text-danger/70'}`}>
        {positive ? '+' : ''}
        {pct.toFixed(1)}% · {formatUnits(position.assetSymbol, position.units)}
      </p>
    </div>
  )
}

export default function OpenPositionsCard() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: positions = [], isLoading } = useGetUserPositionsQuery(userId)
  const closePosition = useClosePositionMutation()

  const open = useMemo(
    () => positions.filter((p) => p.status === 'OPEN'),
    [positions]
  )

  if (!userId) return null

  const handleClose = (positionId: string) => {
    if (!userId) return
    closePosition.mutate({ userId, positionId })
  }

  return (
    <section className="gnex-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-caption uppercase tracking-widest text-text-muted">
          Open positions
        </h2>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-caption font-bold text-text-muted">
          {open.length} active
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {isLoading ? (
          <p className="py-6 text-center font-mono text-caption uppercase tracking-widest text-text-muted">
            Loading positions…
          </p>
        ) : open.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-body-sm text-text-muted">
            No open positions. Trade on any market page with up to 100x leverage.
          </p>
        ) : (
          open.map((position) => {
            const meta = MARKET_ASSETS[position.assetSymbol]
            const long = position.direction === 'Long'
            return (
              <div
                key={position.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
                  <Image
                    src={meta?.logo ?? `/icons/${position.assetSymbol.toLowerCase()}.svg`}
                    alt={meta?.name ?? position.assetSymbol}
                    width={20}
                    height={20}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-body-sm font-black text-text-primary">
                      {position.assetSymbol}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-caption font-black uppercase tracking-wider ${
                        long
                          ? 'border-success-border bg-success-bg text-success'
                          : 'border-danger-border bg-danger-bg text-danger'
                      }`}
                    >
                      {long ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                      {long ? 'Long' : 'Short'} {position.leverage}x
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-caption text-text-muted">
                    {formatKes(position.marginKes)} margin · entry{' '}
                    {formatUsd(position.entryPriceUsd)} · liq{' '}
                    {position.liquidationPriceUsd ? formatUsd(position.liquidationPriceUsd) : '—'}
                  </p>
                </div>

                <PositionPnl position={position} />

                <button
                  type="button"
                  onClick={() => handleClose(position.id)}
                  disabled={closePosition.isPending}
                  aria-label={`Close ${position.assetSymbol} position`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition-colors cursor-pointer hover:border-danger/40 hover:text-danger disabled:opacity-50 gnex-touch-target"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}