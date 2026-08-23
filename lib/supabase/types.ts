/** Asset symbols */
export const ASSET_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "USDT", "XAU"] as const
export type AssetSymbol = (typeof ASSET_SYMBOLS)[number]

/** signal types */
export const SIGNAL_TYPES = [
  'Bullish',
  'Bearish',
  'Accumulation',
  'Scalp',
  'Long-Term'
] as const
export type SignalType = (typeof SIGNAL_TYPES)[number]

/** admin role enum */
export type AdminRoleType =
  | 'super_admin'
  | 'admin'
  | 'support'
  | 'editor'

/**
 * Supabase nested selects return related rows as an array. Normalize to the
 * first trade_tags row (or null) so components can read it as a single object.
 */
export function normalizeTradeTags<T>(
  tags: T | T[] | null | undefined
): T | null {
  if (!tags) return null
  if (Array.isArray(tags)) return tags[0] ?? null
  return tags
}

/** profile model */
export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  monthly_roi: number
  followers_count?: number // Handles Facebook-style follower totals tracking safely
  isFollowingByViewer?: boolean // Tracks whether the active session follows this profile row
  reputation_status?: ReputationStatus | null
  reputation_score?: number | null
}

/** feed post model */
export interface FeedPost {
  id: string
  content: string
  created_at: string
  media_url: string | null
  assetSymbols: AssetSymbol[]
  signalType: SignalType | null
  optimistic?: boolean
  profiles: Profile | null

  trade_tags: {
    asset_symbol: AssetSymbol
    signal_type: SignalType
    price?: string | number | null
    change?: string | null
    direction?: "bullish" | "bearish" | null
  } | null

  likes_count: number
  comments_count: number
  shares_count: number // Root property contract declaration preserved intact
  isLikedByCurrentUser?: boolean // tracks current active browser session engagements
  isSavedByCurrentUser?: boolean // tracks current active browser session saves
}

/** create post payload */
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

/** Admin role table — the row also carries the effective permission codes. */
export interface AdminRole {
  id: string
  user_id: string
  role: AdminRoleType
  permissions: string[] | null
  granted_by: string | null
  created_at: string
  updated_at: string | null
}

/** Community reputation status (decoupled from admin roles). */
export type ReputationStatus =
  | 'new_trader'
  | 'active_trader'
  | 'community_analyst'
  | 'verified_trader'
  | 'top_trader'

export interface TraderReputation {
  user_id: string
  status: ReputationStatus
  score: number
  criteria: Record<string, unknown> | null
  computed_at: string | null
  updated_at: string
}

// =========================================================================
// 🟢 CENTRALIZED NETWORK RESPONSE TYPES (0% COMPONENT DUPLICATION)
// =========================================================================

/** 
 * Fully mapped parent post response shape mimicking raw database select queries.
 * This lives strictly here so that queries files never have to declare local interfaces.
 */
export interface SupabaseFeedPostRow {
  id: string
  content: string
  created_at: string
  media_url: string | null
  likes_count: number
  comments_count: number
  shares_count: number
  assetSymbols: AssetSymbol[]
  signalType: SignalType | null
  profiles: (Profile & {
    trader_reputation?: {
      user_id: string
      status: ReputationStatus
      score: number
    } | null
  }) | null
  trade_tags: {
    asset_symbol: AssetSymbol
    signal_type: SignalType
    price: number | string | null
    change: string | null
    direction: string | null
  } | null
}
