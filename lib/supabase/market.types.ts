import type { AssetSymbol } from '@/lib/supabase/types'

export type AssetType = 'crypto' | 'gold' | 'stable'
export type MarketFilterType = 'All' | 'Crypto' | 'Gold' | 'Watchlist'

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
  logo: string
  priceUsd: number
  change24h: number
  bullishPercent: number
  watcherCount: number
  isWatching: boolean
  sparkline: number[]
  marketCap?: number
  volume24h?: number
  high24h?: number
  low24h?: number
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
  lockedKes: number            // Voluntary user-initiated lock (24h unlock cooling-off)
  reserveKes: number           // Silent 10% platform reserve (visible as a neutral line, not spendable)
  updatedAt: string
}

/** Voluntary user fund lock — separate from the automatic reserve */
export interface FundLock {
  id: string
  userId: string
  amountKes: number
  status: 'locked' | 'unlock_pending' | 'released' | 'cancelled'
  createdAt: string
  unlockAvailableAt: string | null
  releasedAt: string | null
  cancelledAt: string | null
}

/** Savings-style portfolio holding — units of an asset with KES cost basis */
export interface UserHolding {
  id: string
  userId: string
  assetSymbol: AssetSymbol
  units: number
  avgCostKes: number
  updatedAt: string
}

/** Deposit / withdrawal request row used by the wallet history */
export interface FundingRequest {
  id: string
  kind: 'deposit' | 'withdrawal'
  amountKes: number
  provider: string
  mobileNumber: string | null
  reference: string | null
  status: string
  createdAt: string
  paymentChannel?: string | null
  accountNumber?: string | null
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

export interface SentimentMeterProps {
  symbol: AssetSymbol
  bullishPercent: number
}
