import type { AssetSymbol } from '@/lib/supabase/types'

export type AssetType = 'crypto' | 'gold' | 'stable'
export type MarketFilterType = 'All' | 'Crypto' | 'Gold' | 'Watchlist'

export interface MarketAsset {
  symbol: AssetSymbol
  name: string
  logo: string
  assetType: AssetType
}

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

export interface MarketSentiment {
  symbol: AssetSymbol
  bullishPercent: number
  bearishPercent: number
  totalVotes: number
}

export interface MarketMover {
  symbol: AssetSymbol
  priceUsd: number
  change24h: number
  volume24h: number
  type: 'gainer' | 'loser'
}

export interface VerifiedTraderAllocation {
  id: string
  username: string
  avatarUrl: string
  monthlyRoi: number
  primaryAsset: AssetSymbol
  allocationPercent: number
}

export interface StoriesCarouselProps {
  tickers: MarketTicker[]
  onToggleWatchlist: (symbol: AssetSymbol) => void
  onActionClick: (symbol: AssetSymbol, viewMode: 'BUY' | 'SELL') => void
}
