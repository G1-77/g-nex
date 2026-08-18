'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchCryptoPrices } from '@/lib/market/coingecko'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import { useAuth } from '@/components/providers/AuthProvider'
import { useGetUserWatchlistQuery, useToggleWatchlistMutation } from '@/lib/react-query/market/queries.market'
import { useGetUserWalletQuery } from '@/lib/react-query/market/queries.market'
import TradingViewChart from '@/components/market/TradingViewChart'
import TimeframeSelector from '@/components/market/TimeframeSelector'
import ChartTypeToggle from '@/components/market/ChartTypeToggle'
import MetricsGrid from '@/components/market/MetricsGrid'
import SentimentBar from '@/components/market/SentimentBar'
import InsufficientBalanceModal from '@/components/market/InsufficientBalanceModal'
import type { AssetSymbol } from '@/lib/supabase/types'
import type { Timeframe } from '@/lib/market/ohlc'

interface PageProps {
  params: Promise<{ symbol: string }>
}

const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  USDT: 'tether'
}

const KES_TO_USD_RATE = 130

export default function AssetDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const symbol = resolvedParams.symbol.toUpperCase() as AssetSymbol
  const router = useRouter()
  const { user } = useAuth()
  
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick')
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)
  const [tradeAmount, setTradeAmount] = useState<number>(0)

  const liveTickers = useBinanceRealtime()
  const liveTicker = liveTickers.get(symbol)

  const asset = MARKET_ASSETS[symbol]
  const toggleWatchlistMutation = useToggleWatchlistMutation()
  
  const { data: watchlistSymbols = [] } = useGetUserWatchlistQuery(user?.id || null)
  const { data: wallet } = useGetUserWalletQuery(user?.id || null)
  const isWatching = watchlistSymbols.includes(symbol)

  // Fetch live price data
  const { data: priceData, isLoading } = useQuery({
    queryKey: ['asset-price', symbol],
    queryFn: async () => {
      const coinId = COINGECKO_ID_MAP[symbol]
      if (!coinId) throw new Error('Unsupported asset')
      
      const data = await fetchCryptoPrices([coinId])
      return data[0]
    },
    refetchInterval: 30000, // fallback baseline; Binance WS drives live updates
  })

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

    // Example: User wants to buy $100 worth
    const requiredKes = 100 * KES_TO_USD_RATE
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
          <div className="h-12 w-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-mono">Loading {symbol} data...</p>
        </div>
      </div>
    )
  }

  if (!priceData || !asset) {
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

  const currentPrice = liveTicker?.priceUsd ?? priceData.current_price
  const change24h = liveTicker?.change24h ?? priceData.price_change_percentage_24h
  const isPositive = change24h >= 0
  const priceKes = currentPrice * KES_TO_USD_RATE

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-40 -mx-4 md:-mx-6 px-4 md:px-6 bg-slate-950/90 backdrop-blur-xl border-b border-slate-900">
        <div className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="cursor-pointer text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100">{asset.name}</h1>
                <span className="text-xs font-mono text-slate-500 uppercase">
                  {symbol} / {asset.assetType}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleWatchlistToggle}
            disabled={toggleWatchlistMutation.isPending}
            className={`flex items-center justify-center h-10 w-10 rounded-full border transition-all cursor-pointer ${
              isWatching
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`h-4 w-4 ${isWatching ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="py-6 space-y-6 pb-16 md:pb-20">
        {/* Price Display */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-black font-mono text-slate-100">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-xl font-black font-mono ${
                isPositive ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isPositive ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono">
            ≈ KES {priceKes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
          <ChartTypeToggle chartType={chartType} onChange={setChartType} />
        </div>

        {/* Chart */}
        <TradingViewChart
          symbol={symbol}
          timeframe={timeframe}
          chartType={chartType}
          currentPrice={currentPrice}
        />

        {/* Metrics Grid */}
        <MetricsGrid
          high24h={liveTicker?.high24h ?? priceData.high_24h}
          low24h={liveTicker?.low24h ?? priceData.low_24h}
          volume24h={priceData.total_volume}
          marketCap={priceData.market_cap}
        />

        {/* Sentiment Bar */}
        <SentimentBar symbol={symbol} />
      </div>

      {/* Fixed Action Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-900 backdrop-blur-xl p-4">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button
            onClick={handleBuy}
            className="flex-1 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg"
          >
            Buy {symbol}
          </button>
          <button
            onClick={handleSell}
            className="flex-1 cursor-pointer bg-slate-900 hover:bg-[#f43f5e] hover:border-[#f43f5e] border border-slate-800 text-slate-100 hover:text-slate-950 font-black py-4 rounded-xl text-lg transition-all duration-300 active:scale-95"
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
          // Could open amount selector here
        }}
      />
    </div>
  )
}
