
/**Asset symbols */

export const ASSET_SYMBOLS = ['BTC', 'SOL', 'XAU'] as const

export type AssetSymbol = (typeof ASSET_SYMBOLS)[number]

/**signal types */

export const SIGNAL_TYPES = [
  'Bullish',
  'Bearish',
  'Accumulation',
  'Scalp',
  'Long-Term',
] as const

export type SignalType = (typeof SIGNAL_TYPES)[number]

/**admin role enum */

export type AdminRoleType =
  | 'super_admin'
  | 'admin'
  | 'support'
  | 'editor'

/**profile model */

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  monthly_roi: number
}

/**feed post model */

export interface FeedPost {
  id: string
  content: string
  created_at: string
  media_url: string | null
  assetSymbols: AssetSymbol[]
  signalType: SignalType | null
  optimistic: boolean
  profiles: Profile | null
}

/**create post payload */

export interface CreatePostPayload {
  content: string
  assetSymbols?: AssetSymbol[]
  signalType?: SignalType | null
  mediaFile?: File | null

  currentUser?: {
    id: string
    username: string
    full_name?: string | null
    avatar_url?: string | null
    is_verified?: boolean
    monthly_roi?: number | null
  }
}

/** Admin role table */

export interface AdminRole {
  id: string
  user_id: string
  role: AdminRoleType
  created_at: string
}

