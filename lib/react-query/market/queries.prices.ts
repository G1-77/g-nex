'use client'

import { useQuery } from '@tanstack/react-query'
import { getMarketPrices } from '@/lib/market/price-service'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

// Convert API price data to MarketTicker format
function convertToMarketTickers(priceData: any[], watchlist: AssetSymbol[] = []): MarketTicker[] {
  return priceData.map((price) => {
    const asset = MARKET_ASSETS[price.symbol as AssetSymbol]
    
    // Generate simple sparkline from price changes (mock for now)
    const currentPrice = price.price_usd
    const change = price.change_24h
    const prevPrice = currentPrice / (1 + change / 100)
    const sparkline = [
      prevPrice * 0.99,
      prevPrice * 1.01,
      prevPrice * 0.98,
      prevPrice * 1.02,
      currentPrice * 0.99,
      currentPrice
    ]

    // Calculate bullish sentiment (simplified - based on positive change)
    const bullishPercent = change >= 0 ? Math.min(70 + change * 2, 90) : Math.max(30 + change * 2, 10)

    return {
      symbol: price.symbol as AssetSymbol,
      name: asset?.name || price.symbol,
      priceUsd: price.price_usd,
      change24h: price.change_24h,
      bullishPercent: Math.round(bullishPercent),
      watcherCount: Math.floor(Math.random() * 2000) + 100, // Mock for now
      isWatching: watchlist.includes(price.symbol as AssetSymbol),
      sparkline
    }
  })
}

export function useMarketPrices(watchlist: AssetSymbol[] = []) {
  return useQuery({
    queryKey: ['market-prices', watchlist],
    queryFn: async () => {
      const assets = Object.values(MARKET_ASSETS).map(asset => ({
        symbol: asset.symbol,
        type: (asset.assetType === 'stable' ? 'crypto' : asset.assetType) as 'crypto' | 'gold',
        coingecko_id: {
          BTC: 'bitcoin',
          ETH: 'ethereum',
          SOL: 'solana',
          XRP: 'ripple',
          USDT: 'tether',
          XAU: null
        }[asset.symbol] as string | null
      }))

      const prices = await getMarketPrices(assets)
      return convertToMarketTickers(prices, watchlist)
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every 60 seconds
  })
}