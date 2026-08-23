'use client'

// components/trade/SpotTerminal.tsx
// Spot Pro: full order terminal. Market orders execute instantly; limit,
// stop-market and take-profit orders rest in the engine with real balance
// reservations. An engine heartbeat drives fills while the terminal is open.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import TradingViewChart from '@/components/market/TradingViewChart'
import TimeframeSelector from '@/components/market/TimeframeSelector'
import { useAuth } from '@/components/providers/AuthProvider'
import { useNow } from '@/lib/hooks/useNow'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { usePlatformConfigQuery } from '@/lib/react-query/market/queries.config'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import {
  useCancelOrderMutation,
  useEngineTickQuery,
  useExecuteTradeMutation,
  useGetUserOrdersQuery,
  usePlaceOrderMutation,
} from '@/lib/react-query/queries/orders.queries'
import { useGetUserWalletQuery, useGetUserHoldingsQuery } from '@/lib/react-query/market/queries.market'
import { marketKeys } from '@/lib/react-query/market/keys'
import { MARKET_ASSETS_LIST } from '@/lib/constants/market-assets'
import { getPriceStatus, PRICE_STALE_MS, baselineCeilingFor } from '@/lib/market/freshness'
import { timeframesForSymbol } from '@/lib/market/ohlc'
import { formatKes, formatUnits, statusLabel } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { MarketTicker, OrderRow } from '@/lib/supabase/market.types'
import type { BinanceTicker } from '@/lib/market/binance-realtime'
import type { Timeframe } from '@/lib/market/ohlc'
import { cn, safeRandomUUID } from '@/lib/utils'

type FormTab = 'market' | 'limit' | 'stop' | 'tp'

const statusPillClasses: Record<string, string> = {
  live: 'text-success border-success-border bg-success-bg',
  delayed: 'text-warning border-warning-border bg-warning-bg',
  unavailable: 'text-danger border-danger-border bg-danger-bg',
}

export default function SpotTerminal() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()

  const [symbol, setSymbol] = useState<AssetSymbol>('BTC')
  const [timeframe, setTimeframe] = useState<Timeframe>('1H')
  const [tab, setTab] = useState<FormTab>('market')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amountInput, setAmountInput] = useState('50')
  const [limitPriceInput, setLimitPriceInput] = useState('')
  const [triggerPriceInput, setTriggerPriceInput] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)

  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: config } = usePlatformConfigQuery()
  const { data: baseline = [] } = useMarketPrices([symbol])
  const realtime = useBinanceRealtime()
  const { data: orders = [], isLoading: ordersLoading } = useGetUserOrdersQuery(userId)

  // Engine heartbeat: resolves authoritative prices server-side and fills
  // resting conditional orders while this terminal is open. Invalidation MUST
  // target the real marketKeys.* channels — the bare ['wallet']-style keys
  // match nothing and silently skipped reconciliation.
  const engineTick = useEngineTickQuery(userId, true)
  useEffect(() => {
    if (engineTick.data && (engineTick.data.filled > 0 || engineTick.data.expired > 0) && userId) {
      void queryClient.invalidateQueries({ queryKey: marketKeys.wallet(userId) })
      void queryClient.invalidateQueries({ queryKey: marketKeys.holdings(userId) })
      void queryClient.invalidateQueries({ queryKey: marketKeys.orders(userId) })
    }
  }, [engineTick.data, queryClient, userId])

  // Live price: Binance WS overlay on the server snapshot baseline, with
  // provenance-based staleness (receipt time first) instead of raw event-time
  // vs device-clock comparisons that permanently flagged slow feeds as stale.
  const ticker: MarketTicker | undefined = useMemo(() => {
    const base = baseline.find((t) => t.symbol === symbol)
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
      high24h: live.high24h || base?.high24h,
      low24h: live.low24h || base?.low24h,
      lastUpdatedAt: live.lastUpdated,
      receivedAt: live.receivedAt,
      provider: 'binance',
    }
  }, [baseline, realtime, symbol])

  const isStreamed = ticker?.provider === 'binance'
  const now = useNow(5000)
  const priceStatus = !ticker
    ? 'unavailable'
    : now <= 0
      ? 'live'
      : getPriceStatus(ticker, now, isStreamed ? PRICE_STALE_MS : baselineCeilingFor(symbol))
  const priceStale = priceStatus !== 'live'
  const currentPrice = ticker?.priceUsd ?? 0

  // ---- Client-side pre-validation mirroring the server gates. The server
  // re-checks everything at execution time; this exists to explain rejections
  // before submission instead of after.
  const minTradeUsd = config?.minTradeUsd ?? 1
  const maxTradeUsd = config?.maxTradeUsd ?? 50_000

  const amountUsd = Number(amountInput)
  const validAmount = Number.isFinite(amountUsd) && amountUsd > 0
  const limitPrice = Number(limitPriceInput)
  const triggerPrice = Number(triggerPriceInput)

  const heldUnits = holdings.find((h) => h.assetSymbol === symbol)?.units ?? 0
  const maxSellUsd = heldUnits * currentPrice

  let validationError: string | null = null
  if (!userId) validationError = 'Sign in to trade'
  else if (validAmount && amountUsd < minTradeUsd) validationError = `Minimum order is $${minTradeUsd}`
  else if (validAmount && amountUsd > maxTradeUsd) validationError = `Maximum order is $${maxTradeUsd.toLocaleString()}`
  else if (validAmount && side === 'sell' && tab === 'market' && amountUsd > maxSellUsd)
    validationError = `You hold ${formatUnits(symbol, heldUnits)} ${symbol}`

  const openOrders = orders.filter((o) => o.status === 'open' || o.status === 'triggered')
  const historyOrders = orders.filter((o) => !['open', 'triggered'].includes(o.status))

  const executeMutation = useExecuteTradeMutation()
  const placeMutation = usePlaceOrderMutation()
  const cancelMutation = useCancelOrderMutation()

  const busy = executeMutation.isPending || placeMutation.isPending

  function resetForm() {
    setAmountInput('50')
    setLimitPriceInput('')
    setTriggerPriceInput('')
  }

  async function handleSubmit() {
    if (!userId || !validAmount || priceStale || validationError) return
    setFeedback(null)
    try {
      if (tab === 'market') {
        await executeMutation.mutateAsync({
          userId,
          symbol,
          side,
          mode: 'spot',
          amountUsd,
          idempotencyKey: safeRandomUUID(),
          product: 'spot',
        })
        setFeedback({ tone: 'ok', message: `Market ${side} executed.` })
      } else {
        await placeMutation.mutateAsync({
          userId,
          symbol,
          side,
          orderType:
            tab === 'limit' ? 'limit' : tab === 'stop' ? 'stop_market' : 'take_profit',
          amountUsd,
          limitPrice: tab === 'limit' ? limitPrice : undefined,
          triggerPrice: tab === 'limit' ? undefined : triggerPrice,
          idempotencyKey: safeRandomUUID(),
          product: 'spot',
        })
        setFeedback({
          tone: 'ok',
          message:
            tab === 'limit'
              ? 'Limit order placed — funds reserved.'
              : 'Conditional order armed.',
        })
      }
      resetForm()
    } catch (err) {
      setFeedback({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Order failed',
      })
    }
  }

  const canSubmit =
    Boolean(userId) &&
    validAmount &&
    !priceStale &&
    !validationError &&
    !busy &&
    (tab === 'market' ||
      (tab === 'limit' && Number.isFinite(limitPrice) && limitPrice > 0) ||
      ((tab === 'stop' || tab === 'tp') && Number.isFinite(triggerPrice) && triggerPrice > 0))

  async function handleCancel(order: OrderRow) {
    if (!userId) return
    try {
      await cancelMutation.mutateAsync({ userId, orderId: order.id })
    } catch (err) {
      setFeedback({
        tone: 'err',
        message: err instanceof Error ? err.message : 'Cancel failed',
      })
    }
  }

  const tabs: { key: FormTab; label: string }[] = [
    { key: 'market', label: 'Market' },
    { key: 'limit', label: 'Limit' },
    { key: 'stop', label: 'Stop' },
    { key: 'tp', label: 'Take Profit' },
  ]

  return (
    <div className="space-y-4">
      {/* Pair selector */}
      <div className="flex flex-wrap gap-2">
        {MARKET_ASSETS_LIST.map((asset) => (
          <button
            key={asset.symbol}
            type="button"
            onClick={() => {
              setSymbol(asset.symbol)
              setFeedback(null)
            }}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-caption font-bold transition-colors gnex-touch-target',
              symbol === asset.symbol
                ? 'bg-brand-bg text-brand'
                : 'bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            <img src={asset.logo} alt="" className="h-4 w-4 rounded-full" />
            {asset.symbol}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chart column */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-caption uppercase tracking-wider text-text-muted">
                  {symbol}/USD · Spot
                </p>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 font-mono text-caption font-bold tracking-wide',
                    statusPillClasses[priceStatus]
                  )}
                >
                  {priceStatus.toUpperCase()}
                </span>
              </div>
              <p className="font-mono text-mono-lg font-bold text-text-primary">
                {currentPrice ? `$${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                <span
                  className={cn(
                    'ml-2 text-body-sm',
                    (ticker?.change24h ?? 0) >= 0 ? 'text-success' : 'text-danger'
                  )}
                >
                  {(ticker?.change24h ?? 0) >= 0 ? '+' : ''}
                  {(ticker?.change24h ?? 0).toFixed(2)}%
                </span>
              </p>
            </div>
            <TimeframeSelector selected={timeframe} onChange={setTimeframe} timeframes={timeframesForSymbol(symbol)} />
          </div>

          {priceStale && (
            <p className="flex items-center gap-1.5 px-1 text-body-sm text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {priceStatus === 'delayed'
                ? 'Price feed delayed — new orders are paused until the feed recovers.'
                : 'No price data available for this asset.'}
            </p>
          )}

          <TradingViewChart
            symbol={symbol}
            timeframe={timeframe}
            chartType="candlestick"
            currentPrice={currentPrice}
          />
        </div>

        {/* Order form + books column */}
        <div className="space-y-4">
          <div className="gnex-card-elevated p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={cn(
                  'cursor-pointer rounded-xl py-2 text-sm font-bold transition-colors gnex-touch-target',
                  side === 'buy'
                    ? 'bg-success-bg text-success'
                    : 'bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={cn(
                  'cursor-pointer rounded-xl py-2 text-sm font-bold transition-colors gnex-touch-target',
                  side === 'sell'
                    ? 'bg-danger-bg text-danger'
                    : 'bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                Sell
              </button>
            </div>

            <div className="mt-3 flex gap-1 pb-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'cursor-pointer rounded-lg px-2.5 py-1 text-caption font-semibold transition-colors',
                    tab === t.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {tab !== 'market' && (
                <label className="block">
                  <span className="gnex-label">
                    {tab === 'limit' ? 'Limit price (USD)' : 'Trigger price (USD)'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={tab === 'limit' ? limitPriceInput : triggerPriceInput}
                    onChange={(e) =>
                      tab === 'limit'
                        ? setLimitPriceInput(e.target.value)
                        : setTriggerPriceInput(e.target.value)
                    }
                    placeholder={tab === 'limit' ? 'Limit price' : 'Trigger price'}
                    className="gnex-input gnex-input-mono"
                  />
                </label>
              )}

              <label className="block">
                <span className="gnex-label">Amount (USD)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="gnex-input gnex-input-mono"
                />
              </label>

              <p className="flex justify-between text-body-sm text-text-muted">
                <span>Available</span>
                <span className="font-mono">{formatKes(wallet?.balanceKes ?? 0)}</span>
              </p>

              {validationError && (
                <p className="text-body-sm font-medium text-danger">{validationError}</p>
              )}

              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={cn(
                  'gnex-btn w-full py-3 text-sm font-bold',
                  side === 'buy'
                    ? 'gnex-btn-success'
                    : 'gnex-btn-danger',
                  canSubmit ? '' : 'cursor-not-allowed opacity-40'
                )}
              >
                {busy
                  ? 'Submitting…'
                  : tab === 'market'
                    ? `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`
                    : `Place ${tabs.find((t) => t.key === tab)?.label} Order`}
              </button>
              {!canSubmit && !busy && !validationError && (
                <p className="text-center text-body-sm text-text-muted">
                  {!userId
                    ? 'Sign in to trade'
                    : priceStale
                      ? priceStatus === 'delayed'
                        ? 'Price feed delayed — orders paused for safety'
                        : 'Price unavailable'
                      : tab === 'limit'
                        ? 'Enter a limit price to continue'
                        : tab !== 'market'
                          ? 'Enter a trigger price to continue'
                          : 'Enter an amount to continue'}
                </p>
              )}
            </div>
          </div>

          {feedback && (
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-body-sm',
                feedback.tone === 'ok'
                  ? 'bg-success-bg text-success'
                  : 'bg-danger-bg text-danger'
              )}
            >
              {feedback.message}
            </div>
          )}

          {/* Open orders */}
          <div className="gnex-card-elevated p-4">
            <h3 className="mb-2 font-mono text-caption uppercase tracking-wider text-text-muted">
              Open Orders ({openOrders.length})
            </h3>
            {openOrders.length === 0 ? (
              <p className="py-3 text-center text-body-sm text-text-muted">No open orders.</p>
            ) : (
              <ul className="divide-y divide-border">
                {openOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-text-primary">
                        {statusLabel(order.status)} · {order.side.toUpperCase()} {order.assetSymbol ?? ''}{' '}
                        <span className="font-mono text-text-muted">{formatKes(order.quantity * (order.price ?? order.triggerPrice ?? 0))}</span>
                      </p>
                      <p className="font-mono text-caption text-text-muted">
                        {order.orderType.replace('_', ' ')} ·{' '}
                        {order.price ?? order.triggerPrice
                          ? `$${(order.price ?? order.triggerPrice)?.toLocaleString()}`
                          : '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(order)}
                      disabled={cancelMutation.isPending}
                      className="shrink-0 cursor-pointer rounded-lg bg-surface/40 p-1.5 text-text-muted hover:bg-surface-hover hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 gnex-touch-target"
                      aria-label="Cancel order"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Order history */}
          <div className="gnex-card-elevated p-4">
            <h3 className="mb-2 font-mono text-caption uppercase tracking-wider text-text-muted">
              Order History
            </h3>
            {ordersLoading ? (
              <p className="py-3 text-center text-body-sm text-text-muted">Loading…</p>
            ) : historyOrders.length === 0 ? (
              <p className="py-3 text-center text-body-sm text-text-muted">No completed orders yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {historyOrders.slice(0, 15).map((order) => (
                  <li key={order.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-body-sm font-semibold text-text-primary">
                        {order.side.toUpperCase()} {order.assetSymbol ?? ''}
                      </p>
                      <p className="font-mono text-caption text-text-muted">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-body-sm font-bold uppercase',
                          order.status === 'filled'
                            ? 'text-success'
                            : order.status === 'expired'
                              ? 'text-warning'
                              : 'text-text-muted'
                        )}
                      >
                        {statusLabel(order.status)}
                      </p>
                      {order.realizedPnlKes !== null && (
                        <p
                          className={cn(
                            'font-mono text-caption',
                            order.realizedPnlKes >= 0 ? 'text-success' : 'text-danger'
                          )}
                        >
                          PnL {formatKes(order.realizedPnlKes)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}