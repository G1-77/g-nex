'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import { useAuth } from '@/components/providers/AuthProvider'
import { useNow } from '@/lib/hooks/useNow'
import { useGetUserWatchlistQuery, useToggleWatchlistMutation } from '@/lib/react-query/market/queries.market'
import { useGetUserWalletQuery, useUsdKesRate } from '@/lib/react-query/market/queries.market'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { getPriceStatus, PRICE_STALE_MS, baselineCeilingFor } from '@/lib/market/freshness'
import { timeframesForSymbol } from '@/lib/market/ohlc'
import TradingViewChart from '@/components/market/TradingViewChart'
import TimeframeSelector from '@/components/market/TimeframeSelector'
import ChartTypeToggle from '@/components/market/ChartTypeToggle'
import MetricsGrid from '@/components/market/MetricsGrid'
import SentimentBar from '@/components/market/SentimentBar'
import InsufficientBalanceModal from '@/components/market/InsufficientBalanceModal'
import ExecutionPanel from '@/components/market/asset/ExecutionPanel'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { Timeframe } from '@/lib/market/ohlc'

interface PageProps {
  params: Promise<{ symbol: string }>
}

export default function AssetDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const symbol = resolvedParams.symbol.toUpperCase() as AssetSymbol
  const router = useRouter()
  const { user } = useAuth()

  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick')
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)
  const [tradeAmount, setTradeAmount] = useState<number>(0)
  const now = useNow(5000)

  const asset = MARKET_ASSETS[symbol]
  const toggleWatchlistMutation = useToggleWatchlistMutation()

  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id || null)
  const { data: wallet } = useGetUserWalletQuery(user?.id || null)
  const { data: usdKesRate = 130 } = useUsdKesRate()
  const isWatching = watchlistSymbols.includes(symbol)

  // Authoritative price via the shared server snapshot + Binance WS overlay.
  // The browser never contacts CoinGecko/xaus directly on this page.
  const { data: tickers = [], isLoading } = useMarketPrices([symbol])
  const ticker = tickers.find((t) => t.symbol === symbol)

  const handleWatchlistToggle = () => {
    if (!user) {
      alert('Please sign in to manage your watchlist')
      return
    }
    toggleWatchlistMutation.mutate({ userId: user.id, symbol })
  }

  const handleBuy = () => {
    if (!user) {
      router.push('/login')
      return
    }

    // Example: User wants to buy $100 worth (live FX rate, not a hardcoded one)
    const requiredKes = 100 * usdKesRate
    const availableBalance = wallet?.balanceKes || 0

    if (availableBalance < requiredKes) {
      setTradeAmount(requiredKes)
      setShowInsufficientModal(true)
      return
    }

    // Proceed with trade
    router.push(`/markets/${symbol.toLowerCase()}/trade?side=buy`)
  }

  const handleSell = () => {
    if (!user) {
      router.push('/login')
      return
    }
    router.push(`/markets/${symbol.toLowerCase()}/trade?side=sell`)
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 border-4 border-slate-800 border-t-yellow-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-mono">Loading {symbol} data...</p>
        </div>
      </div>
    )
  }

  if (!ticker || !asset) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-bold text-slate-300">Asset not found</p>
          <button
            onClick={() => router.back()}
            className="cursor-pointer text-sm text-emerald-500 hover:text-emerald-400"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  const currentPrice = ticker.priceUsd
  const change24h = ticker.change24h
  const isPositive = change24h >= 0
  const priceKes = currentPrice * usdKesRate

  // Honest freshness status for this asset's feed. Pre-mount renders
  // optimistically as live; the clock settles on the first effect pass.
  const isStreamed = ticker.provider === 'binance'
  const priceStatus =
    now <= 0
      ? 'live'
      : getPriceStatus(ticker, now, isStreamed ? PRICE_STALE_MS : baselineCeilingFor(symbol))

return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-40 -mx-4 md:-mx-6 px-4 md:px-6 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="cursor-pointer text-text-secondary hover:text-text-primary transition-colors gnex-touch-target"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-text-primary">{asset.name}</h1>
                <span className="text-xs font-mono text-text-muted uppercase">
                  {symbol} / {asset.assetType}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleWatchlistToggle}
            disabled={toggleWatchlistMutation.isPending}
            className={`flex items-center justify-center h-10 w-10 rounded-full border transition-all cursor-pointer gnex-touch-target ${
              isWatching
                ? 'bg-brand border-brand text-text-inverse'
                : 'bg-surface/40 border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <Star className={`h-4 w-4 ${isWatching ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="py-6 space-y-6 pb-16 md:pb-20 lg:flex lg:items-start lg:gap-6 lg:pr-96">
        {/* Main chart column */}
        <div className="space-y-6 flex-1 min-w-0">
          {/* Price Display */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl md:text-5xl font-black font-mono text-text-primary">
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xl font-black font-mono ${
                  isPositive ? 'text-success' : 'text-danger'
                }`}
              >
                {isPositive ? '+' : ''}{change24h.toFixed(2)}%
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide ${
                  priceStatus === 'live'
                    ? 'text-success bg-success-bg'
                    : priceStatus === 'delayed'
                      ? 'text-warning bg-warning-bg'
                      : 'text-danger bg-danger-bg'
                }`}
              >
                {priceStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-text-muted font-mono">
              ≈ KES {priceKes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Chart Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TimeframeSelector
              selected={timeframe}
              onChange={setTimeframe}
              timeframes={timeframesForSymbol(symbol)}
            />
            <ChartTypeToggle chartType={chartType} onChange={setChartType} />
          </div>

          {/* Chart */}
          <div className="gnex-card-elevated overflow-hidden">
            <TradingViewChart
              symbol={symbol}
              timeframe={timeframe}
              chartType={chartType}
              currentPrice={currentPrice}
            />
          </div>

          {/* Metrics Grid */}
          <MetricsGrid
            high24h={ticker.high24h ?? null}
            low24h={ticker.low24h ?? null}
            volume24h={ticker.volume24h ?? null}
            marketCap={ticker.marketCap ?? null}
          />

          {/* Sentiment Bar */}
          <SentimentBar symbol={symbol} />
        </div>

        {/* Desktop execution panel */}
        <aside className="hidden lg:block w-96 shrink-0">
          <div className="sticky top-20 gnex-card-elevated p-4">
            <ExecutionPanel symbol={symbol} />
          </div>
        </aside>
      </div>

      {/* Fixed Action Bar (mobile/tablet) */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-background/95 border-t border-border backdrop-blur-xl p-4 lg:hidden">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button
            onClick={handleBuy}
            className="flex-1 cursor-pointer bg-success hover:bg-success/90 text-text-inverse font-black py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg gnex-touch-target"
          >
            Buy {symbol}
          </button>
          <button
            onClick={handleSell}
            className="flex-1 cursor-pointer bg-danger hover:bg-danger/90 text-text-inverse font-black py-4 rounded-xl text-lg transition-all active:scale-95 gnex-touch-target"
          >
            Sell {symbol}
          </button>
        </div>
      </div>

      {/* Insufficient Balance Modal */}
      <InsufficientBalanceModal
        isOpen={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        symbol={symbol}
        requiredAmount={tradeAmount}
        availableBalance={wallet?.balanceKes || 0}
        onDeposit={() => {
          setShowInsufficientModal(false)
          router.push('/wallet/deposit')
        }}
        onAdjustAmount={() => {
          setShowInsufficientModal(false)
        }}
      />
    </div>
  )
}
