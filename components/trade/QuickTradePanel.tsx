'use client'

// components/trade/QuickTradePanel.tsx
// Quick Trade: one-tap market execution. The panel shows the authoritative
// live price (server snapshot + Binance WS overlay), a server-computed quote,
// and executes with product='quick_trade'. Execution is blocked only when the
// price is genuinely stale/unavailable or the amount violates platform bounds.
// Includes chart preview on hover (desktop) / tap (mobile) per brief §18/§19.

import { useMemo, useState, useEffect } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, Maximize2, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/AuthProvider'
import { useNow } from '@/lib/hooks/useNow'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { usePlatformConfigQuery } from '@/lib/react-query/market/queries.config'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import { usePriceHistory } from '@/lib/market/binance-realtime'
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
import SparklineArea from '@/components/market/SparklineArea'

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
  const [chartExpanded, setChartExpanded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: config } = usePlatformConfigQuery()
  const { data: usdKesRate = 130 } = useUsdKesRate()
  const { data: prices = [] } = useMarketPrices([symbol])
  const realtime = useBinanceRealtime()
  const liveHistory = usePriceHistory(symbol)

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
  const status: PriceStatus = !ticker
    ? 'unavailable'
    : now <= 0
      ? 'live'
      : getPriceStatus(ticker, now, isStreamed ? PRICE_STALE_MS : baselineCeilingFor(symbol))
  const priceStale = status !== 'live'
  const ageSeconds = priceAgeSeconds(ticker, now)

  const currentPriceUsd = Number.isFinite(ticker?.priceUsd) ? ticker?.priceUsd ?? 0 : 0

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
  else if (amountInput.trim() === '' || parsedAmount <= 0) validationError = null
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
            ? `Bought ${formatUnits(symbol, result.quantity)} ${symbol} @ $${Number.isFinite(result.priceUsd) ? result.priceUsd.toLocaleString() : '—'} — ${formatKes(result.amountKes)} debited (fee ${formatKes(result.feeKes)})`
            : `Sold ${formatUnits(symbol, result.quantity)} ${symbol} @ $${Number.isFinite(result.priceUsd) ? result.priceUsd.toLocaleString() : '—'} — ${formatKes(result.amountKes)} credited (fee ${formatKes(result.feeKes)})`,
      })
    } catch (err) {
      setFeedback({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Trade failed',
      })
    }
  }

  const statusPill: Record<PriceStatus, { label: string; className: string }> = {
    live: { label: 'LIVE', className: 'text-success border-success-border bg-success-bg' },
    delayed: { label: 'DELAYED', className: 'text-warning border-warning-border bg-warning-bg' },
    unavailable: { label: 'UNAVAILABLE', className: 'text-danger border-danger-border bg-danger-bg' },
  }

  const sparklineData = liveHistory.length >= 2 ? Array.from(liveHistory) : (ticker?.sparkline ?? [])
  const sparklineColor = (ticker?.change24h ?? 0) >= 0 ? '#8DFF45' : '#FF5A5A'

  const showChart = chartExpanded || (!isMobile && isHovering)

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
              setChartExpanded(false)
            }}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors gnex-touch-target',
              symbol === asset.symbol
                ? 'bg-brand-bg'
                : 'bg-surface/40 hover:bg-surface-hover'
            )}
          >
            <img src={asset.logo} alt="" className="h-5 w-5 rounded-full" />
            <span className="text-body-sm font-bold text-text-primary">{asset.symbol}</span>
          </button>
        ))}
      </div>

      {/* Live price header with chart preview trigger */}
      <div
        className="gnex-card-elevated p-4 relative"
        onMouseEnter={() => !isMobile && setIsHovering(true)}
        onMouseLeave={() => !isMobile && setIsHovering(false)}
        onClick={() => isMobile && setChartExpanded(!chartExpanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption uppercase tracking-wider text-text-muted">
              {symbol}/USD
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-caption font-bold tracking-wide',
                statusPill[status].className
              )}
            >
              {statusPill[status].label}
            </span>
          </div>
          <span
            className={cn(
              'font-mono text-body-sm font-semibold',
              (ticker?.change24h ?? 0) >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {(ticker?.change24h ?? 0) >= 0 ? '+' : ''}
            {(ticker?.change24h ?? 0).toFixed(2)}%
          </span>
        </div>
        <p className="mt-1 font-mono text-mono-lg font-bold text-text-primary">
          {ticker ? `$${ticker.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
        </p>
        <p className="mt-1 font-mono text-caption text-text-muted">
          ≈ KES {ticker ? (ticker.priceUsd * usdKesRate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
          {status === 'live' && ageSeconds !== null && (
            <span className="ml-2 text-text-muted">· updated {ageSeconds}s ago</span>
          )}
          {status === 'delayed' && (
            <span className="ml-2 text-warning/80">· trading paused for safety</span>
          )}
          {status === 'unavailable' && (
            <span className="ml-2 text-danger/80">· no price data</span>
          )}
        </p>
        {priceStale && (
          <p className="mt-2 flex items-start gap-1.5 text-body-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {status === 'delayed'
              ? 'The price feed has not refreshed recently. Orders are paused until it recovers.'
              : 'No live price is available for this asset right now.'}
          </p>
        )}

        {/* Chart preview - expanded on hover (desktop) or tap (mobile) */}
        <AnimatePresence>
          {showChart && sparklineData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-3 overflow-hidden rounded-xl bg-surface/40"
            >
              <div className="relative h-48 p-3">
                <SparklineArea data={sparklineData} color={sparklineColor} height={180} className="h-full w-full" />
                {isMobile && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setChartExpanded(false) }}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Close chart"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                )}
                {!isMobile && !chartExpanded && (
                  <div className="absolute bottom-2 right-2 text-xs text-text-muted font-mono">
                    Hover for chart
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart expand button for mobile */}
        {isMobile && sparklineData.length > 1 && !chartExpanded && (
          <button
            type="button"
            onClick={() => setChartExpanded(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Tap to view chart</span>
          </button>
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
            'flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-colors gnex-touch-target',
            side === 'buy'
              ? 'bg-success-bg text-success'
              : 'bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary'
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
            'flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-colors gnex-touch-target',
            side === 'sell'
              ? 'bg-danger-bg text-danger'
              : 'bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary'
          )}
        >
          <ArrowDownRight className="h-4 w-4" />
          Sell
        </button>
      </div>

      {/* Amount */}
      <div className="gnex-card-elevated p-4">
        <label htmlFor="quick-trade-amount" className="gnex-label">
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
            'gnex-input gnex-input-mono text-mono-xl',
            validationError ? 'text-danger' : ''
          )}
        />
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => applyFraction(0)}
            className="shrink-0 cursor-pointer rounded-full bg-surface/40 px-3 py-1 text-caption font-semibold text-text-secondary transition-colors hover:bg-surface-hover"
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
                'shrink-0 rounded-full bg-surface/40 px-3 py-1 text-caption font-semibold text-text-secondary transition-colors hover:bg-surface-hover',
                sideCapUsd > 0 && 'cursor-pointer',
                sideCapUsd <= 0 && 'cursor-not-allowed opacity-40'
              )}
            >
              {fraction === 1 ? 'MAX' : `${fraction * 100}%`}
            </button>
          ))}
        </div>
        {validationError ? (
          <p className="mt-2 text-body-sm font-medium text-danger">{validationError}</p>
        ) : (
          <p className="mt-2 text-body-sm text-text-muted">
            {side === 'buy' ? (
              <>
                Available <span className="font-mono text-text-secondary">{formatKes(balanceKes)} KES</span>
              </>
            ) : (
              <>
                You hold{' '}
                <span className="font-mono text-text-secondary">
                  {formatUnits(symbol, heldUnits)} {symbol}
                </span>{' '}
                <span className="text-text-muted">(≈ ${Number.isFinite(maxSellUsd) ? maxSellUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'})</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Quote preview */}
      {quote && (
        <div className="space-y-1.5 gnex-card-elevated p-4 text-body-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Price</span>
            <span className="font-mono text-text-primary">${Number.isFinite(quote.priceUsd) ? quote.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Rate</span>
            <span className="font-mono text-text-primary">{formatKes(quote.priceUsd * quote.fxRate)} KES/{symbol}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Trading fee ({(quote.feeRate * 100).toFixed(2).replace(/\.00$/, '')}%)</span>
            <span className="font-mono text-text-primary">{formatKes(quote.feeKes)}</span>
          </div>
          {side === 'buy' ? (
            <>
              <div className="flex justify-between pt-1.5 font-semibold text-text-primary">
                <span>Total cost</span>
                <span className="font-mono">{formatKes(quote.amountKes)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>You receive</span>
                <span className="font-mono text-text-primary">{formatUnits(symbol, quote.quantity)} {symbol}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-text-secondary">
                <span>Gross proceeds</span>
                <span className="font-mono text-text-primary">{formatKes(parsedAmount * quote.fxRate)}</span>
              </div>
              <div className="flex justify-between pt-1.5 font-semibold text-text-primary">
                <span>Net proceeds</span>
                <span className="font-mono">{formatKes(quote.amountKes)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>You sell</span>
                <span className="font-mono text-text-primary">{formatUnits(symbol, quote.quantity)} {symbol}</span>
              </div>
            </>
          )}
        </div>
      )}
      {validAmount && quoteLoading && !quote && (
        <p className="text-center font-mono text-caption text-text-muted">Fetching quote…</p>
      )}

      {/* Execute */}
      <button
        type="button"
        disabled={!canExecute}
        onClick={handleExecute}
        className={cn(
          'gnex-btn w-full py-4 text-base font-bold',
          side === 'buy'
            ? 'gnex-btn-success'
            : 'gnex-btn-danger',
          canExecute ? '' : 'cursor-not-allowed opacity-40'
        )}
      >
        {executeMutation.isPending
          ? 'Executing…'
          : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
      </button>
      {!canExecute && !executeMutation.isPending && blockedReason && (
        <p className="text-center text-body-sm text-text-muted">{blockedReason}</p>
      )}

      {feedback && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-2xl px-4 py-3 text-body-sm',
            feedback.tone === 'ok'
              ? 'bg-success-bg text-success'
              : 'bg-danger-bg text-danger'
          )}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {feedback.message}
        </div>
      )}
    </div>
  )
}