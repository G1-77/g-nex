'use client'

// components/trade/SpotTerminal.tsx
// Spot Pro: full order terminal. Market orders execute instantly; limit,
// stop-market and take-profit orders rest in the engine with real balance
// reservations. An engine heartbeat drives fills while the terminal is open.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import TradingViewChart from '@/components/market/TradingViewChart'
import { useAuth } from '@/components/providers/AuthProvider'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import {
  useCancelOrderMutation,
  useEngineTickQuery,
  useExecuteTradeMutation,
  useGetUserOrdersQuery,
  usePlaceOrderMutation,
} from '@/lib/react-query/queries/orders.queries'
import { useGetUserWalletQuery } from '@/lib/react-query/market/queries.market'
import { MARKET_ASSETS_LIST } from '@/lib/constants/market-assets'
import { isPriceStale } from '@/lib/market/freshness'
import { formatKes, statusLabel } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { MarketTicker, OrderRow } from '@/lib/supabase/market.types'
import type { BinanceTicker } from '@/lib/market/binance-realtime'
import type { Timeframe } from '@/lib/market/ohlc'
import { cn } from '@/lib/utils'

type FormTab = 'market' | 'limit' | 'stop' | 'tp'

const TIMEFRAMES: Timeframe[] = ['1H', '4H', '1D', '1W']

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
  const { data: baseline = [] } = useMarketPrices([symbol])
  const realtime = useBinanceRealtime()
  const { data: orders = [], isLoading: ordersLoading } = useGetUserOrdersQuery(userId)

  // Engine heartbeat: resolves authoritative prices server-side and fills
  // resting conditional orders while this terminal is open.
  const engineTick = useEngineTickQuery(userId, true)
  useEffect(() => {
    if (engineTick.data && (engineTick.data.filled > 0 || engineTick.data.expired > 0)) {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      void queryClient.invalidateQueries({ queryKey: ['holdings'] })
    }
  }, [engineTick.data, queryClient])

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
  const currentPrice = ticker?.priceUsd ?? 0

  const amountUsd = Number(amountInput)
  const validAmount = Number.isFinite(amountUsd) && amountUsd > 0
  const limitPrice = Number(limitPriceInput)
  const triggerPrice = Number(triggerPriceInput)

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
    if (!userId || !validAmount || priceStale) return
    setFeedback(null)
    try {
      if (tab === 'market') {
        await executeMutation.mutateAsync({
          userId,
          symbol,
          side,
          mode: 'spot',
          amountUsd,
          idempotencyKey: crypto.randomUUID(),
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
          idempotencyKey: crypto.randomUUID(),
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
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
              symbol === asset.symbol
                ? 'border-yellow-600/60 bg-yellow-600/10 text-yellow-500'
                : 'border-slate-800 text-slate-400 hover:border-slate-700'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.logo} alt="" className="h-4 w-4 rounded-full" />
            {asset.symbol}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chart column */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-500">
                {symbol}/USD · Spot
              </p>
              <p className="font-mono text-2xl font-bold text-slate-100">
                {currentPrice ? `$${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                <span
                  className={cn(
                    'ml-2 text-sm',
                    (ticker?.change24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {(ticker?.change24h ?? 0) >= 0 ? '+' : ''}
                  {(ticker?.change24h ?? 0).toFixed(2)}%
                </span>
              </p>
            </div>
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-xs transition-colors',
                    timeframe === tf
                      ? 'bg-slate-800 text-yellow-500'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {priceStale && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Price feed delayed — new orders are paused until the feed recovers.
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
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={cn(
                  'rounded-xl border py-2 text-sm font-bold transition-colors',
                  side === 'buy'
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
                    : 'border-slate-800 text-slate-400'
                )}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={cn(
                  'rounded-xl border py-2 text-sm font-bold transition-colors',
                  side === 'sell'
                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-400'
                    : 'border-slate-800 text-slate-400'
                )}
              >
                Sell
              </button>
            </div>

            <div className="mt-3 flex gap-1 border-b border-slate-800 pb-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    tab === t.key ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {tab !== 'market' && (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
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
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-slate-600"
                  />
                </label>
              )}

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Amount (USD)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-slate-600"
                />
              </label>

              <p className="flex justify-between text-[11px] text-slate-500">
                <span>Available</span>
                <span className="font-mono">{formatKes(wallet?.balanceKes ?? 0)}</span>
              </p>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-bold transition-all',
                  side === 'buy'
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-rose-500 text-slate-950 hover:bg-rose-400',
                  !canSubmit && 'cursor-not-allowed opacity-40'
                )}
              >
                {busy
                  ? 'Submitting…'
                  : tab === 'market'
                    ? `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`
                    : `Place ${tabs.find((t) => t.key === tab)?.label} Order`}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={cn(
                'rounded-2xl border px-4 py-3 text-xs',
                feedback.tone === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              )}
            >
              {feedback.message}
            </div>
          )}

          {/* Open orders */}
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-xl">
            <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-slate-500">
              Open Orders ({openOrders.length})
            </h3>
            {openOrders.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-600">No open orders.</p>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {openOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {statusLabel(order.status)} · {order.side.toUpperCase()} {order.assetSymbol ?? ''}{' '}
                        <span className="font-mono text-slate-500">{formatKes(order.quantity * (order.price ?? order.triggerPrice ?? 0))}</span>
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
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
                      className="shrink-0 rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-40"
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
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-xl">
            <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-slate-500">
              Order History
            </h3>
            {ordersLoading ? (
              <p className="py-3 text-center text-xs text-slate-600">Loading…</p>
            ) : historyOrders.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-600">No completed orders yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {historyOrders.slice(0, 15).map((order) => (
                  <li key={order.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {order.side.toUpperCase()} {order.assetSymbol ?? ''}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-[11px] font-bold uppercase',
                          order.status === 'filled'
                            ? 'text-emerald-400'
                            : order.status === 'expired'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                        )}
                      >
                        {statusLabel(order.status)}
                      </p>
                      {order.realizedPnlKes !== null && (
                        <p
                          className={cn(
                            'font-mono text-[10px]',
                            order.realizedPnlKes >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
