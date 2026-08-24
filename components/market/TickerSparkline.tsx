'use client'

// components/market/TickerSparkline.tsx
// THE shared GNEX ticker sparkline. Every price row across the app renders its
// movement through this one component so all charts share the same wavy
// SparklineArea treatment and the same data-integrity rules:
//   - Binance WS observation history is used only when it has >6 points
//     (the server baseline is a 6-point ramp and is NEVER drawn).
//   - Symbols without a WS pair (e.g. gold) fall back to real candles from
//     the authoritative OHLC route — hourly for crypto, daily for gold.
//   - If neither exists the cell shows a loading placeholder, never a
//     fabricated flat line.

import { useOHLCcloses } from '@/lib/react-query/market/queries.history'
import SparklineArea from '@/components/market/SparklineArea'
import type { MarketTicker } from '@/lib/supabase/market.types'

const SUCCESS_COLOR = '#8DFF45'
const DANGER_COLOR = '#FF5A5A'

interface TickerSparklineProps {
  ticker: MarketTicker
  positive: boolean
  className?: string
}

export default function TickerSparkline({ ticker, positive, className = 'h-7 w-12 shrink-0 sm:h-8 sm:w-16' }: TickerSparklineProps) {
  const wsHistory =
    Array.isArray(ticker.sparkline) && ticker.sparkline.length > 6 ? ticker.sparkline : null

  const { data: closes } = useOHLCcloses(
    wsHistory
      ? null
      : {
          symbols: [ticker.symbol],
          timeframe: ticker.symbol === 'XAU' ? '1D' : '1H',
          points: 32,
        }
  )

  const series = wsHistory ?? closes?.[ticker.symbol]?.map((p) => p.close) ?? null

  return (
    <div className={className} aria-hidden="true">
      {series && series.length >= 2 ? (
        <SparklineArea
          data={series}
          color={positive ? SUCCESS_COLOR : DANGER_COLOR}
          height={32}
          className="h-full w-full"
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded bg-surface-hover/60" />
      )}
    </div>
  )
}
