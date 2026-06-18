import type { AssetSymbol } from '@/lib/supabase/types'

export type AssetType = 'crypto' | 'gold' | 'stable'
export type MarketFilterType = 'All' | 'Crypto' | 'Gold' | 'Watchlist'
export type ChartTimeframe = '1H' | '4H' | '1D' | '1W' | '1M'

/** Base catalog taxonomy definition model for global assets */
export interface MarketAsset {
  symbol: AssetSymbol
  name: string
  logo: string
  assetType: AssetType
}

/** Section 2 & 4: Live high-frequency price telemetry matrix model */
export interface MarketTicker {
  symbol: AssetSymbol
  name: string
  priceUsd: number
  change24h: number
  bullishPercent: number
  watcherCount: number
  isWatching: boolean
  sparkline: number[]
}

/** Section 3: Group sentiment consensus metrics format */
export interface MarketSentiment {
  symbol: AssetSymbol
  bullishPercent: number
  bearishPercent: number
  totalVotes: number
}

/** Section 5: Momentum discovery gainer or loser node item structure */
export interface MarketMover {
  symbol: AssetSymbol
  priceUsd: number
  change24h: number
  volume24h: number
  type: 'gainer' | 'loser'
}

/** Real-time watchlist layout state tracker configuration row */
export interface WatchlistAsset {
  id: string
  userId: string
  symbol: AssetSymbol
  createdAt: string
}

/** Section 6: Verified social behavior capital tracking data block */
export interface VerifiedTraderAllocation {
  id: string
  username: string
  avatarUrl: string
  monthlyRoi: number
  primaryAsset: AssetSymbol
  allocationPercent: number
}

/** Wallet accounting model driving dual-currency liquidity features */
export interface UserWalletState {
  id: string
  userId: string
  balanceKes: number           // Tracked in local KES to drive local financial motivation
  escrowKes: number            // Locked escrow margin safety pool balance
  updatedAt: string
}

/** Live open position entry log matrix model */
export interface ActivePositionNode {
  id: string
  userId: string
  assetSymbol: AssetSymbol
  direction: 'Long' | 'Short'
  entryPriceUsd: number        // Tracked in USD to align with charts
  units: number
  marginKes: number            // Margin backed safely by their KES wallet rows
  status: 'OPEN' | 'CLOSED'
  createdAt: string
}

/** Extended telemetry node schema contract model for single asset detail screens */
export interface AssetDetailPayload {
  symbol: AssetSymbol
  name: string
  priceUsd: number
  change24h: number
  volume24h: number
  marketCapUsd: number
  watcherCount: number
  isWatching: boolean
  bullishPercent: number
}


// FIXED: Restored the exact property mapping contract for the single-asset banner header
export interface AssetHeroProps {
  asset: AssetDetailPayload
  onToggleWatchlist: (symbol: AssetSymbol) => void
}

export interface StoriesCarouselProps {
  tickers: MarketTicker[]
  onToggleWatchlist: (symbol: AssetSymbol) => void
  onActionClick: (symbol: AssetSymbol, viewMode: 'BUY' | 'SELL') => void
}

export interface MarketGridProps {
  tickers: MarketTicker[]
  activeFilter: MarketFilterType
  onToggleWatchlist: (symbol: AssetSymbol) => void
  onActionClick: (symbol: AssetSymbol, viewMode: 'BUY' | 'SELL') => void
}

export interface StickyTradeFooterProps {
  selectedSymbol: AssetSymbol
  priceUsd: number
  onActionClick: (symbol: AssetSymbol, viewMode: 'BUY' | 'SELL' | 'DEPOSIT') => void
}

export interface TradingViewChartProps {
  symbol: AssetSymbol
}

export interface SentimentMeterProps {
  symbol: AssetSymbol
  bullishPercent: number
}
