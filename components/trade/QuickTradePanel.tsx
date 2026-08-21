'use client'

// components/trade/QuickTradePanel.tsx
// Quick Trade: one-tap market execution. The panel shows live prices, a
// server-authoritative quote preview, and executes with product='quick_trade'.
// Execution is blocked when the local price snapshot is provably stale.

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import {
  useExecuteTradeMutation,
  useTradeQuoteQuery,
} from '@/lib/react-query/queries/orders.queries'
import { useGetUserWalletQuery } from '@/lib/react-query/market/queries.market'
import { MARKET_ASSETS_LIST } from '@/lib/constants/market-assets'
import { isPriceStale } from '@/lib/market/freshness'
import { formatKes, formatUnits } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { BinanceTicker } from '@/lib/market/binance-realtime'
import { cn } from '@/lib/utils'

const AMOUNT_PRESETS = [10, 25, 50, 100]

export default function QuickTradePanel() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [symbol, setSymbol] = useState<AssetSymbol>('BTC')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amountInput, setAmountInput] = useState('50')
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)

  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: baseline = [] } = useMarketPrices([symbol])
  const realtime = useBinanceRealtime()

  const balanceKes = wallet?.balanceKes ?? 0

  // Live price: Binance stream overlay on the server snapshot; XAU only has
  // the slower provider feed. Staleness is computed from provenance stamps.
  const ticker: MarketTicker | undefined = useMemo(() => {
    const base = baseline.find((t) => t.symbol === symbol)
    const live: BinanceTicker | undefined = realtime.get(symbol)
    if (!base && !live) return undefined
    if (!live) return base
    return {
      ...(base ?? ({} as MarketTicker)),
      symbol,
      priceUsd: live.priceUsd,
      change24h: live.change24h,
      lastUpdatedAt: live.lastUpdated,
    }
  }, [baseline, realtime, symbol])

  const priceStale = isPriceStale(ticker?.lastUpdatedAt)

  const amountUsd = Number(amountInput)
  const validAmount = Number.isFinite(amountUsd) && amountUsd > 0

  const { data: quote, isLoading: quoteLoading } = useTradeQuoteQuery(
    validAmount ? { symbol, side, mode: 'spot', amountUsd, product: 'quick_trade' } : null
  )

  const executeMutation = useExecuteTradeMutation()

  const canExecute =
    Boolean(userId) &&
    validAmount &&
    !priceStale &&
    !executeMutation.isPending &&
    quote !== undefined

  async function handleExecute() {
    if (!userId || !canExecute) return
    setFeedback(null)
    try {
      const result = await executeMutation.mutateAsync({
        userId,
        symbol,
        side,
        mode: 'spot',
        amountUsd,
        idempotencyKey: crypto.randomUUID(),
        product: 'quick_trade',
      })
      setFeedback({
        tone: 'ok',
        message:
          side === 'buy'
            ? `Bought ${formatUnits(symbol, result.quantity)} ${symbol} — ${formatKes(result.amountKes)} debited`
            : `Sold ${formatUnits(symbol, result.quantity)} ${symbol} — ${formatKes(result.amountKes)} credited`,
      })
    } catch (err) {
      setFeedback({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Trade failed',
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      {/* Asset selector */}
      <div className="grid grid-cols-3 gap-2">
        {MARKET_ASSETS_LIST.map((asset) => (
          <button
            key={asset.symbol}
            type="button"
            onClick={() => {
              setSymbol(asset.symbol)
              setFeedback(null)
            }}
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors',
              symbol === asset.symbol
                ? 'border-yellow-600/60 bg-yellow-600/10'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.logo} alt="" className="h-5 w-5 rounded-full" />
            <span className="text-xs font-bold text-slate-200">{asset.symbol}</span>
          </button>
        ))}
      </div>

      {/* Live price header */}
      <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
            {symbol}/USD live
          </span>
          <span
            className={cn(
              'font-mono text-sm font-semibold',
              (ticker?.change24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {(ticker?.change24h ?? 0) >= 0 ? '+' : ''}
            {(ticker?.change24h ?? 0).toFixed(2)}%
          </span>
        </div>
        <p className="mt-1 font-mono text-2xl font-bold text-slate-100">
          {ticker ? `$${ticker.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
        </p>
        {priceStale && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Price feed delayed — trading paused for safety.
          </p>
        )}
      </div>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-colors',
            side === 'buy'
              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
              : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-colors',
            side === 'sell'
              ? 'border-rose-500/60 bg-rose-500/15 text-rose-400'
              : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
          )}
        >
          <ArrowDownRight className="h-4 w-4" />
          Sell
        </button>
      </div>

      {/* Amount */}
      <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-xl">
        <label className="font-mono text-xs uppercase tracking-wider text-slate-500">
          Amount (USD)
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full bg-transparent font-mono text-2xl font-bold text-slate-100 outline-none placeholder:text-slate-700"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmountInput(String(preset))}
              className="rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-slate-600"
            >
              ${preset}
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Available</span>
          <span className="font-mono">{formatKes(balanceKes)}</span>
        </p>
      </div>

      {/* Quote preview */}
      {quote && (
        <div className="space-y-1.5 rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 text-xs backdrop-blur-xl">
          <div className="flex justify-between text-slate-400">
            <span>Rate</span>
            <span className="font-mono text-slate-200">{formatKes(quote.priceUsd * quote.fxRate)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Fee ({quote.feePercent}%)</span>
            <span className="font-mono text-slate-200">{formatKes(quote.feeKes)}</span>
          </div>
          {side === 'buy' ? (
            <>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 font-semibold text-slate-200">
                <span>Total (KES)</span>
                <span className="font-mono">{formatKes(quote.amountKes + quote.feeKes)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>You receive</span>
                <span className="font-mono text-slate-200">{formatUnits(symbol, quote.quantity)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 font-semibold text-slate-200">
                <span>You receive</span>
                <span className="font-mono">{formatKes(quote.amountKes - quote.feeKes)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>You sell</span>
                <span className="font-mono text-slate-200">{formatUnits(symbol, quote.quantity)}</span>
              </div>
            </>
          )}
        </div>
      )}
      {validAmount && quoteLoading && !quote && (
        <p className="text-center font-mono text-xs text-slate-600">Fetching quote…</p>
      )}

      {/* Execute */}
      <button
        type="button"
        disabled={!canExecute}
        onClick={handleExecute}
        className={cn(
          'w-full rounded-2xl py-4 text-base font-bold transition-all',
          side === 'buy'
            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            : 'bg-rose-500 text-slate-950 hover:bg-rose-400',
          !canExecute && 'cursor-not-allowed opacity-40'
        )}
      >
        {executeMutation.isPending
          ? 'Executing…'
          : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
      </button>

      {feedback && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs',
            feedback.tone === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          )}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {feedback.message}
        </div>
      )}
    </div>
  )
}
