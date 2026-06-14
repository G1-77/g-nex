import type { AssetSymbol } from './types'

export type AssetType = 'crypto' | 'gold' | 'stable'
export type MarketFilterType = 'All' | 'Crypto' | 'Gold' | 'Watchlist'

// =========================================================================
// 🟢 TASK 3 OVERHAUL: STRICT PHASE-ALIGNED CONTRACT MODELS
// =========================================================================

/** Centralized asset definition signature contract (Task 4) */
export interface MarketAsset {
  symbol: AssetSymbol
  name: string
  logo: string
  assetType: AssetType
}

/** High-density snapshot contract feeding our Facebook-style stories carousel (Task 2) */
export interface MarketTicker {
  symbol: AssetSymbol
  priceUsd: number
  change24h: number
  bullishPercent: number
  isWatching: boolean
}

/** Phase 3 social intelligence community sentiment metrics contract */
export interface MarketSentiment {
  symbol: AssetSymbol
  bullishPercent: number
  bearishPercent: number
  totalVotes: number
}

/** Phase 5 momentum gainer / loser discovery tracking matrix */
export interface MarketMover {
  symbol: AssetSymbol
  priceUsd: number
  change24h: number
  volume24h: number
  type: 'gainer' | 'loser'
}

/** Real-time user watchlist tracking entry ledger row */
export interface WatchlistAsset {
  id: string
  userId: string
  symbol: AssetSymbol
  createdAt: string
}

// =========================================================================
// 💼 WALLET ACCOUNTING INTEGRITY CONTRACT LAYERS (KES VALUES SECURED)
// =========================================================================

/** User wallet accounting parameters (Tracks local KES wealth realization psychology) */
export interface UserWalletState {
  id: string
  userId: string
  balanceKes: number           // Managed strictly in KES to drive local financial motivation
  escrowKes: number            // Escrow margin safety pool balance
  updatedAt: string
}

/** Live open trading position tracking leverage contract model */
export interface ActivePositionNode {
  id: string
  userId: string
  assetSymbol: AssetSymbol
  direction: 'Long' | 'Short'
  entryPriceUsd: number        // Handled strictly in USD to match institutional charts
  units: number
  marginKes: number            // Margin backed securely out of local KES wallet allocations
  status: 'OPEN' | 'CLOSED'
  createdAt: string
}

/** Unified data contract for the carousel component properties wrapper */
export interface StoriesCarouselProps {
  tickers: MarketTicker[]
  onToggleWatchlist: (symbol: AssetSymbol) => void
}
