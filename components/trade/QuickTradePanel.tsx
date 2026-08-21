'use client'

// components/trade/QuickTradePanel.tsx
// Quick Trade: one-tap market execution. The panel shows the authoritative
// live price (server snapshot + Binance WS overlay), a server-computed quote,
// and executes with product='quick_trade'. Execution is blocked only when the
// price is genuinely stale/unavailable or the amount violates platform bounds.

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useNow } from '@/lib/hooks/useNow'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { usePlatformConfigQuery } from '@/lib/react-query/market/queries.config'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import {
  useExecuteTradeMutation,
  useTradeQuoteQuery,
} from '@/lib/react-query/queries/orders.queries'
import { useGetUserWalletQuery, useGetUserHoldingsQuery, useUsdKesRate } from '@/lib/react-query/market/queries.market'
import { MARKET_ASSETS_LIST } from '@/lib/constants/market-assets'
import { getPriceStatus, PRICE_STALE_MS, baselineCeilingFor, type PriceStatus } from '@/lib/market/freshness'
import { formatKes, formatUnits } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { BinanceTicker } from '@/lib/market/binance-realtime'
import { cn, safeRandomUUID } from '@/lib/utils'

const SIDE_CAPS = [0.25, 0.5, 0.75, 1] as const

function priceAgeSeconds(ticker: MarketTicker | undefined, now: number): number | null {
  if (!ticker || now <= 0) return null
  const signals = [ticker.receivedAt, ticker.lastUpdatedAt].filter(
    (t): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0
  )
  if (signals.length === 0) return null
  return Math.max(0, Math.round((now - Math.max(...signals)) / 1000))
}

export default function QuickTradePanel() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [symbol, setSymbol] = useState<AssetSymbol>('BTC')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amountInput, setAmountInput] = useState('50')
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)

  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: config } = usePlatformConfigQuery()
  const { data: usdKesRate = 130 } = useUsdKesRate()
  const { data: prices = [] } = useMarketPrices([symbol])
  const realtime = useBinanceRealtime()

  const minTradeUsd = config?.minTradeUsd ?? 1
  const maxTradeUsd = config?.maxTradeUsd ?? 50_000
  const feeRate = config?.tradingFeeRate ?? 0.02

  const balanceKes = wallet?.balanceKes ?? 0

  // Live price: Binance stream overlay on the server snapshot; XAU/USDT ride
  // the slower provider feed with an honest ceiling. Staleness is computed
  // from provenance stamps (receipt time first), never the raw device clock.
  const ticker: MarketTicker | undefined = useMemo(() => {
    const base = prices.find((t) => t.symbol === symbol)
    const live: BinanceTicker | undefined = realtime.get(symbol)
    if (!base && !live) return undefined
    if (!live) return base
    return {
      ...(base ?? ({} as MarketTicker)),
      symbol,
      name: base?.name ?? symbol,
      logo: base?.logo ?? '',
      priceUsd: live.priceUsd,
      change24h: live.change24h,
      lastUpdatedAt: live.lastUpdated,
      receivedAt: live.receivedAt,
      provider: 'binance',
    }
  }, [prices, realtime, symbol])

  const isStreamed = ticker?.provider === 'binance'
  const now = useNow(1000)
  // Pre-mount (now === 0) renders optimistically as live; the clock hook
  // settles on its first effect pass and any real staleness shows instantly.
  const status: PriceStatus = !ticker
    ? 'unavailable'
    : now <= 0
      ? 'live'
      : getPriceStatus(ticker, now, isStreamed ? PRICE_STALE_MS : baselineCeilingFor(symbol))
  const priceStale = status !== 'live'
  const ageSeconds = priceAgeSeconds(ticker, now)

  const currentPriceUsd = ticker?.priceUsd ?? 0

  // ---- Side-specific caps (client-side pre-validation; the server re-checks).
  // BUY: cost incl. fee must fit the KES balance. SELL: cannot exceed held value.
  const heldUnits = holdings.find((h) => h.assetSymbol === symbol)?.units ?? 0
  const maxBuyUsd = balanceKes / (usdKesRate * (1 + feeRate))
  const maxSellUsd = heldUnits * currentPriceUsd
  const sideCapUsd = side === 'buy' ? maxBuyUsd : maxSellUsd

  const amountUsd = Number(amountInput)
  const parsedAmount = Number.isFinite(amountUsd) ? amountUsd : 0

  let validationError: string | null = null
  if (!userId) validationError = 'Sign in to trade'
  else if (amountInput.trim() === '' || parsedAmount <= 0) validationError = null // neutral, not an error state
  else if (parsedAmount < minTradeUsd) validationError = `Minimum trade is $${minTradeUsd}`
  else if (parsedAmount > maxTradeUsd) validationError = `Maximum trade is $${maxTradeUsd.toLocaleString()}`
  else if (side === 'buy' && parsedAmount > maxBuyUsd) validationError = 'Insufficient KES balance for this amount'
  else if (side === 'sell' && parsedAmount > maxSellUsd) validationError = `You hold ${formatUnits(symbol, heldUnits)} ${symbol}`

  const validAmount = validationError === null && parsedAmount > 0

  const { data: quote, isLoading: quoteLoading } = useTradeQuoteQuery(
    validAmount ? { symbol, side, mode: 'spot', amountUsd: parsedAmount, product: 'quick_trade' } : null
  )

  const executeMutation = useExecuteTradeMutation()

  const blockedReason =
    !userId
      ? 'Sign in to trade'
      : status === 'unavailable'
        ? 'Price unavailable'
        : status === 'delayed'
          ? 'Price feed delayed — trading paused for safety'
          : validationError

  const canExecute =
    Boolean(userId) &&
    validAmount &&
    !priceStale &&
    !executeMutation.isPending &&
    quote !== undefined &&
    !blockedReason

  function applyFraction(fraction: number) {
    if (fraction <= 0) {
      setAmountInput(String(minTradeUsd))
      return
    }
    const cap = fraction === 1 ? sideCapUsd : sideCapUsd * fraction
    const rounded = Math.floor(cap * 100) / 100
    setAmountInput(rounded >= minTradeUsd ? String(rounded) : String(minTradeUsd))
  }

  async function handleExecute() {
    if (!userId || !canExecute) return
    setFeedback(null)
    try {
      const result = await executeMutation.mutateAsync({
        userId,
        symbol,
        side,
        mode: 'spot',
        amountUsd: parsedAmount,
        idempotencyKey: safeRandomUUID(),
        product: 'quick_trade',
      })
      setFeedback({
        tone: 'ok',
        message:
          side === 'buy'
            ? `Bought ${formatUnits(symbol, result.quantity)} ${symbol} @ $${result.priceUsd.toLocaleString()} — ${formatKes(result.amountKes)} debited (fee ${formatKes(result.feeKes)})`
            : `Sold ${formatUnits(symbol, result.quantity)} ${symbol} @ $${result.priceUsd.toLocaleString()} — ${formatKes(result.amountKes)} credited (fee ${formatKes(result.feeKes)})`,
      })
    } catch (err) {
      setFeedback({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Trade failed',
      })
    }
  }

  const statusPill: Record<PriceStatus, { label: string; className: string }> = {
    live: { label: 'LIVE', className: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    delayed: { label: 'DELAYED', className: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    unavailable: { label: 'UNAVAILABLE', className: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
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
              'flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors',
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
              {symbol}/USD
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide',
                statusPill[status].className
              )}
            >
              {statusPill[status].label}
            </span>
          </div>
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
        <p className="mt-1 font-mono text-[11px] text-slate-500">
          ≈ KES {ticker ? (ticker.priceUsd * usdKesRate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
          {status === 'live' && ageSeconds !== null && (
            <span className="ml-2 text-slate-600">· updated {ageSeconds}s ago</span>
          )}
          {status === 'delayed' && (
            <span className="ml-2 text-amber-400/80">· trading paused for safety</span>
          )}
          {status === 'unavailable' && (
            <span className="ml-2 text-rose-400/80">· no price data</span>
          )}
        </p>
        {priceStale && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {status === 'delayed'
              ? 'The price feed has not refreshed recently. Orders are paused until it recovers.'
              : 'No live price is available for this asset right now.'}
          </p>
        )}
      </div>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setSide('buy')
            setFeedback(null)
          }}
          className={cn(
            'flex cursor-pointer items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-colors',
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
          onClick={() => {
            setSide('sell')
            setFeedback(null)
          }}
          className={cn(
            'flex cursor-pointer items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-colors',
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
        <label htmlFor="quick-trade-amount" className="font-mono text-xs uppercase tracking-wider text-slate-500">
          Amount (USD)
        </label>
        <input
          id="quick-trade-amount"
          type="number"
          inputMode="decimal"
          min={minTradeUsd}
          max={maxTradeUsd}
          step="any"
          value={amountInput}
          onChange={(e) => {
            setAmountInput(e.target.value)
            setFeedback(null)
          }}
          placeholder="0.00"
          aria-invalid={Boolean(validationError)}
          className={cn(
            'mt-1 w-full bg-transparent font-mono text-2xl font-bold outline-none placeholder:text-slate-700',
            validationError ? 'text-rose-300' : 'text-slate-100'
          )}
        />
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => applyFraction(0)}
            className="shrink-0 cursor-pointer rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600"
          >
            MIN
          </button>
          {SIDE_CAPS.map((fraction) => (
            <button
              key={fraction}
              type="button"
              onClick={() => applyFraction(fraction)}
              disabled={sideCapUsd <= 0}
              className={cn(
                'shrink-0 rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600',
                sideCapUsd > 0 && 'cursor-pointer',
                sideCapUsd <= 0 && 'cursor-not-allowed opacity-40'
              )}
            >
              {fraction === 1 ? 'MAX' : `${fraction * 100}%`}
            </button>
          ))}
        </div>
        {validationError ? (
          <p className="mt-2 text-xs font-medium text-rose-400">{validationError}</p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            {side === 'buy' ? (
              <>
                Available <span className="font-mono text-slate-300">{formatKes(balanceKes)} KES</span>
              </>
            ) : (
              <>
                You hold{' '}
                <span className="font-mono text-slate-300">
                  {formatUnits(symbol, heldUnits)} {symbol}
                </span>{' '}
                <span className="text-slate-600">(≈ ${maxSellUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Quote preview */}
      {quote && (
        <div className="space-y-1.5 rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 text-xs backdrop-blur-xl">
          <div className="flex justify-between text-slate-400">
            <span>Price</span>
            <span className="font-mono text-slate-200">${quote.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Rate</span>
            <span className="font-mono text-slate-200">{formatKes(quote.priceUsd * quote.fxRate)} KES/{symbol}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Trading fee ({(quote.feeRate * 100).toFixed(2).replace(/\.00$/, '')}%)</span>
            <span className="font-mono text-slate-200">{formatKes(quote.feeKes)}</span>
          </div>
          {side === 'buy' ? (
            <>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 font-semibold text-slate-200">
                <span>Total cost</span>
                <span className="font-mono">{formatKes(quote.amountKes)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>You receive</span>
                <span className="font-mono text-slate-200">{formatUnits(symbol, quote.quantity)} {symbol}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-400">
                <span>Gross proceeds</span>
                <span className="font-mono text-slate-200">{formatKes(parsedAmount * quote.fxRate)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 font-semibold text-slate-200">
                <span>Net proceeds</span>
                <span className="font-mono">{formatKes(quote.amountKes)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>You sell</span>
                <span className="font-mono text-slate-200">{formatUnits(symbol, quote.quantity)} {symbol}</span>
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
          canExecute ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
        )}
      >
        {executeMutation.isPending
          ? 'Executing…'
          : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
      </button>
      {!canExecute && !executeMutation.isPending && blockedReason && (
        <p className="text-center text-xs text-slate-500">{blockedReason}</p>
      )}

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
