export const ASSET_SYMBOLS = ['BTC', 'SOL', 'XAU'] as const

export type AssetSymbol = (typeof ASSET_SYMBOLS)[number]

export const SIGNAL_TYPES = [
  'Bullish',
  'Bearish',
  'Accumulation',
  'Scalp',
  'Long-Term',
] as const

export type SignalType = (typeof SIGNAL_TYPES)[number]

export interface FeedPost {
  id: string
  content: string
  created_at: string

  assetSymbols: AssetSymbol[]
  signalType: SignalType | null
  optimistic: boolean

  profiles: {
    id: string
    username: string
    avatar_url: string | null
    full_name: string | null
  }
}

export interface CreatePostPayload {
  content: string
  assetSymbol: AssetSymbol[]
  signalType: SignalType | null
}