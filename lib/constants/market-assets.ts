
import type { AssetSymbol } from '@/lib/supabase/types'
import { MarketAsset } from '../supabase/market.types'

export const MARKET_ASSETS: Record<AssetSymbol, MarketAsset> = {
  BTC: { symbol: 'BTC' as AssetSymbol, name: 'Bitcoin', logo: '/icons/btc.svg', assetType: 'crypto' },
  ETH: { symbol: 'ETH' as AssetSymbol, name: 'Ethereum', logo: '/icons/eth.svg', assetType: 'crypto' },
  SOL: { symbol: 'SOL' as AssetSymbol, name: 'Solana', logo: '/icons/sol.svg', assetType: 'crypto' },
  XRP: { symbol: 'XRP' as AssetSymbol, name: 'Ripple', logo: '/icons/xrp.svg', assetType: 'crypto' },
  USDT: { symbol: 'USDT' as AssetSymbol, name: 'Tether', logo: '/icons/usdt.svg', assetType: 'stable' },
  XAU: { symbol: 'XAU' as AssetSymbol, name: 'Spot Gold', logo: '/icons/xau.svg', assetType: 'gold' },
} as const

export const MARKET_ASSETS_LIST: MarketAsset[] = Object.values(MARKET_ASSETS)
