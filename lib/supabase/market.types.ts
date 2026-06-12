import type { AssetSymbol, } from './types'

/** Design system style tokens matching our visual rules guidelines */
export interface MarketDesignTokens {
  bg: string
  card: string
  primary: string
  bullish: string
  bearish: string
}

/** Active filter chip selection options string array template */
export type MarketFilterType = 'All' | 'Crypto' | 'Gold' | 'Watchlist'

/** 
 * THE FACEBOOK-STYLE STORIES DATA CONTRACT MODEL
 * Strictly handles prices in USD while structuring social parameters for our top marquee
 */
export interface AssetStoryNode {
  symbol: AssetSymbol
  name: string
  priceUsd: number             // Managed strictly in USD to prevent investor sticker shock
  change24h: number            // 24h percentage delta (e.g. +4.5%)
  bullishPercent: number       // Sentiment weight calculated from Phase 3 engines
  isWatching: boolean          // Tracks current user's personalized watchlist state
}

/** User wallet accounting metrics data structure */
export interface UserWalletState {
  id: string
  userId: string
  balanceKes: number           // Managed strictly in KES to drive local financial motivation
  escrowKes: number            // Escrow margin safety pool balance
  updatedAt: string
}

/** Live open trading position tracking ledger data row contract */
export interface ActivePositionNode {
  id: string
  userId: string
  assetSymbol: AssetSymbol
  direction: 'Long' | 'Short'
  entryPriceUsd: number
  units: number
  marginKes: number
  status: 'OPEN' | 'CLOSED'
  createdAt: string
}

export interface AssetStoryCarouselProps {
  stories: AssetStoryNode[]
  onToggleWatchlist: (symbol: string) => void
}

export interface MarketFilterChipsProps {
  activeFilter: MarketFilterType
  onFilterChange: (filter: MarketFilterType) => void
}