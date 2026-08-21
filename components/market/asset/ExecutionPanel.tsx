'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, Landmark, Loader2, ShieldAlert, Zap } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import {
  useGetUserHoldingsQuery,
  useGetUserWalletQuery,
  useUsdKesRate,
} from '@/lib/react-query/market/queries.market'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import {
  useClosePositionMutation,
  useExecuteTradeMutation,
  useTradeQuoteQuery,
} from '@/lib/react-query/queries/orders.queries'
import { useGetUserPositionsQuery } from '@/lib/react-query/queries/positions.queries'
import { formatKes, formatUnits, formatUsd } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { TradeExecutionResult, TradeMode, TradeSide } from '@/lib/supabase/market.types'

interface ExecutionPanelProps {
  symbol: AssetSymbol
  initialSide?: TradeSide
}

interface OpenPositionSummary {
  id: string
  direction: 'Long' | 'Short'
  leverage: number
  marginKes: number
  liquidationPriceUsd: number | null
  entryPriceUsd: number
}

function priceColor(side: TradeSide, active: boolean) {
  if (!active) return 'text-slate-500 hover:text-slate-300 bg-transparent'
  return side === 'buy'
    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
    : 'bg-rose-500 text-slate-100 shadow-md shadow-rose-500/10'
}

export default function ExecutionPanel({ symbol, initialSide = 'buy' }: ExecutionPanelProps) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [side, setSide] = useState<TradeSide>(initialSide)
  const [mode, setMode] = useState<TradeMode>('spot')
  const [amountUsd, setAmountUsd] = useState<string>('100')
  const [leverage, setLeverage] = useState(5)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<TradeExecutionResult | null>(null)
  const idempotencyRef = useRef<string | null>(null)

  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: positions = [] } = useGetUserPositionsQuery(userId)
  const { data: tickers = [] } = useMarketPrices([symbol])
  const { data: usdKes = 130 } = useUsdKesRate()

  const ticker = tickers.find((t) => t.symbol === symbol)
  const priceUsd = ticker?.priceUsd ?? 0

  const balanceKes = wallet?.balanceKes ?? 0
  const balanceUsd = balanceKes / usdKes
  const holding = holdings.find((h) => h.assetSymbol === symbol)
  const holdingUnits = holding?.units ?? 0
  const holdingValueUsd = holdingUnits * priceUsd

  // Buying power for percentage chips:
  //  - buy spot: KES cash, net of fee
  //  - buy margin: cash * leverage
  //  - sell spot/margin: value of held units
  const feeFactor = 1 - 0.005
  const spotBuyPowerUsd = Math.max(0, balanceUsd * feeFactor)
  const marginBuyPowerUsd = Math.max(0, balanceUsd * leverage * feeFactor)
  const sellPowerUsd = Math.max(0, holdingValueUsd)
  const maxAmountUsd =
    mode === 'margin' ? marginBuyPowerUsd : side === 'buy' ? spotBuyPowerUsd : sellPowerUsd

  const amount = Number(amountUsd)

  const quoteInput = useMemo(
    () =>
      Number.isFinite(amount) && amount > 0 && priceUsd > 0
        ? { symbol, side, mode, amountUsd: amount, leverage: mode === 'margin' ? leverage : undefined }
        : null,
    [amount, side, mode, leverage, symbol, priceUsd]
  )
  const quote = useTradeQuoteQuery(quoteInput)

  const executeTrade = useExecuteTradeMutation()
  const closePosition = useClosePositionMutation()

  const openPositions = useMemo<OpenPositionSummary[]>(
    () =>
      positions
        .filter((p) => p.status === 'OPEN' && p.assetSymbol === symbol)
        .map((p) => ({
          id: p.id,
          direction: p.direction,
          leverage: p.leverage,
          marginKes: p.marginKes,
          liquidationPriceUsd: p.liquidationPriceUsd,
          entryPriceUsd: p.entryPriceUsd,
        })),
    [positions, symbol]
  )

  const handlePercentage = (fraction: number) => {
    setResult(null)
    setConfirming(false)
    setAmountUsd(Math.max(0, maxAmountUsd * fraction).toFixed(2))
  }

  const reset = () => {
    setConfirming(false)
    setResult(null)
    idempotencyRef.current = null
  }

  const handleConfirm = () => {
    setResult(null)
    if (!userId) return
    if (idempotencyRef.current === null) {
      idempotencyRef.current = crypto.randomUUID()
    }
    setConfirming(true)
  }

  const handleExecute = () => {
    if (!userId || idempotencyRef.current === null) return
    executeTrade.mutate(
      {
        userId,
        symbol,
        side,
        mode,
        amountUsd: amount,
        leverage: mode === 'margin' ? leverage : undefined,
        idempotencyKey: idempotencyRef.current,
      },
      {
        onSuccess: (data) => {
          setResult(data)
          setConfirming(false)
        },
      }
    )
  }

  const handleClosePosition = (positionId: string) => {
    if (!userId) return
    closePosition.mutate({ userId, positionId })
  }

  const pending = executeTrade.isPending
  const canExecute = userId && Number.isFinite(amount) && amount > 0 && !pending

  return (
    <div className="flex flex-col gap-4">
      {/* BUY / SELL TOGGLE */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {(['buy', 'sell'] as TradeSide[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSide(s)
              reset()
            }}
            className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${priceColor(
              s,
              side === s
            )}`}
          >
            {s === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
          </button>
        ))}
      </div>

      {/* SPOT / MARGIN MODE */}
      <div className="flex rounded-lg border border-slate-900/60 bg-slate-900/20 p-1">
        {(['spot', 'margin'] as TradeMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              reset()
            }}
            className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all border-none cursor-pointer outline-none ${
              mode === m ? 'bg-slate-900 text-slate-200' : 'text-slate-600 hover:text-slate-400 bg-transparent'
            }`}
          >
            {m === 'spot' ? 'Spot' : `Margin · {${leverage}}x`}
          </button>
        ))}
      </div>

      {/* AMOUNT INPUT */}
      <div className="space-y-2.5 rounded-xl border border-slate-900 bg-slate-900/30 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</span>
          <span className="font-mono text-[10px] text-slate-500">
            {mode === 'margin' ? 'USD exposure' : 'USD'}
          </span>
        </div>

        <div className="flex items-baseline">
          <span className="mr-1 font-mono text-lg font-black text-slate-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amountUsd}
            onChange={(e) => {
              setAmountUsd(e.target.value)
              reset()
            }}
            className="w-full bg-transparent border-none text-slate-100 font-mono text-xl font-black focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* LIQUIDITY / ESTIMATED COST LINE */}
        <div className="flex items-center justify-between border-t border-slate-900/40 pt-2 font-mono text-[10px]">
          <span className="text-slate-500">
            {mode === 'margin' ? 'Margin required' : 'Estimated cost'}
          </span>
          <span className="font-black text-slate-300">
            {quote.data
              ? formatKes(quote.data.amountKes)
              : quote.isFetching
                ? '…'
                : `≈ ${formatKes(amount * usdKes)}`}
          </span>
        </div>

        {mode === 'margin' && (
          <div className="flex items-center justify-between border-t border-slate-900/40 pt-2 font-mono text-[10px]">
            <span className="text-slate-500">Liquidation</span>
            <span className="font-black text-rose-400/90">
              {quote.data?.liquidationPriceUsd
                ? formatUsd(quote.data.liquidationPriceUsd)
                : '—'}
            </span>
          </div>
        )}

        {quote.isError && (
          <p className="text-[10px] font-semibold text-rose-400">
            {quote.error instanceof Error ? quote.error.message : 'Quote unavailable'}
          </p>
        )}
      </div>

      {/* LEVERAGE SELECTOR (margin only) */}
      {mode === 'margin' && (
        <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Leverage</span>
            <span className="font-mono text-xs font-black text-amber-400">{leverage}x</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={leverage}
            onChange={(e) => {
              setLeverage(Number(e.target.value))
              reset()
            }}
            className="mt-2 w-full accent-amber-500"
          />
          <div className="mt-1 grid grid-cols-4 gap-1">
            {[2, 5, 10, 20].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLeverage(l)
                  reset()
                }}
                className={`rounded-md border py-1 font-mono text-[9px] font-black transition-colors cursor-pointer ${
                  leverage === l
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PERCENTAGE CHIPS */}
      <div className="grid grid-cols-4 gap-1.5 font-mono">
        {[
          { label: '25%', fraction: 0.25 },
          { label: '50%', fraction: 0.5 },
          { label: '75%', fraction: 0.75 },
          { label: 'MAX', fraction: 1 },
        ].map((pct) => (
          <button
            key={pct.label}
            type="button"
            onClick={() => handlePercentage(pct.fraction)}
            className="rounded-lg border border-slate-900 bg-slate-900/40 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-400 transition-colors cursor-pointer hover:border-slate-800 hover:text-slate-200"
          >
            {pct.label}
          </button>
        ))}
      </div>

      {/* AVAILABLE LINE */}
      <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
        <span>
          {side === 'sell' ? 'Available to sell' : mode === 'margin' ? 'Buying power' : 'Available cash'}
        </span>
        <span className="font-bold text-slate-300">
          {side === 'sell' ? formatUnits(symbol, holdingUnits) : formatUsd(maxAmountUsd)}
        </span>
      </div>

      {/* EXECUTE / CONFIRM */}
      {confirming && quote.data ? (
        <div className="space-y-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Confirm order</p>
          <dl className="space-y-1 font-mono text-[10px]">
            <div className="flex justify-between">
              <dt className="text-slate-500">{side} {symbol}</dt>
              <dd className="font-bold text-slate-200">
                {mode === 'margin' ? `${formatKes(quote.data.amountKes)} margin` : formatKes(quote.data.amountKes)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Rate</dt>
              <dd className="font-bold text-slate-200">{formatUsd(quote.data.priceUsd)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Quantity</dt>
              <dd className="font-bold text-slate-200">{quote.data.quantity}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Fee</dt>
              <dd className="font-bold text-slate-200">{formatKes(quote.data.feeKes)}</dd>
            </div>
          </dl>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-xl border border-slate-800 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition-colors cursor-pointer hover:bg-slate-900 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={!canExecute}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                side === 'buy'
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-rose-500 text-slate-100 hover:bg-rose-400'
              }`}
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? 'Executing…' : 'Confirm'}
            </button>
          </div>
          {executeTrade.isError && (
            <p className="text-[10px] font-semibold text-rose-400">
              {executeTrade.error instanceof Error ? executeTrade.error.message : 'Trade failed'}
            </p>
          )}
        </div>
      ) : result ? (
        <div className="space-y-2.5 rounded-xl border border-[#8DFF45]/25 bg-[#8DFF45]/5 p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#8DFF45]">
            <Check className="h-3.5 w-3.5" /> Order filled
          </p>
          <dl className="space-y-1 font-mono text-[10px]">
            <div className="flex justify-between">
              <dt className="text-slate-500">{result.side} {result.symbol} · {result.mode}</dt>
              <dd className="font-bold text-slate-200">{result.quantity}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Filled at</dt>
              <dd className="font-bold text-slate-200">{formatUsd(result.priceUsd)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Fee</dt>
              <dd className="font-bold text-slate-200">{formatKes(result.feeKes)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Cash balance</dt>
              <dd className="font-bold text-slate-200">{formatKes(result.wallet.balanceKes)}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl border border-slate-800 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-colors cursor-pointer hover:bg-slate-900"
          >
            New order
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canExecute}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
            side === 'buy'
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/10 hover:bg-emerald-400'
              : 'bg-rose-500 text-slate-100 shadow-rose-500/10 hover:bg-rose-400'
          }`}
        >
          <Zap className="h-3.5 w-3.5 fill-current" />
          <span>Review {side} {symbol}</span>
        </button>
      )}

      <div className="flex items-center justify-center gap-2 font-mono text-[9px] text-slate-500">
        <Landmark className="h-3 w-3" />
        <span>Executed USD-first · settled from your KES wallet</span>
      </div>

      {/* OPEN POSITIONS (margin) */}
      {openPositions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-slate-900 bg-slate-900/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Open {symbol} positions
          </p>
          {openPositions.map((position) => (
            <div
              key={position.id}
              className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-black text-slate-200">
                  {position.direction} · {position.leverage}x
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                  {formatKes(position.marginKes)} margin · liq{' '}
                  {position.liquidationPriceUsd ? formatUsd(position.liquidationPriceUsd) : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleClosePosition(position.id)}
                disabled={closePosition.isPending}
                className="shrink-0 rounded-lg border border-slate-800 px-2.5 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-slate-300 transition-colors cursor-pointer hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50"
              >
                {closePosition.isPending ? '…' : 'Close'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-slate-900 bg-slate-900/10 p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-amber-500" />
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
            Liquidity Safety Alert
          </span>
          <span className="mt-0.5 truncate font-mono text-[10px] font-bold text-slate-400">
            Platform fee 0.5% · slippage guarded server-side
          </span>
        </div>
      </div>
    </div>
  )
}