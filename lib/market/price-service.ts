// lib/market/price-service.ts

import type { MarketPrice } from '@/types/market'
import type { CoinGeckoMarket } from '@/types/market'

import { fetchCryptoPrices } from './coingecko'
import { fetchGoldPrice } from './gold'
import { fetchUsdKesRate } from './fx'
import { normalizeCrypto } from './normalize'

type Asset = {
  symbol: string
  type: 'crypto' | 'gold'
  coingecko_id: string | null
}

export async function getMarketPrices(
  assets: Asset[]
): Promise<MarketPrice[]> {
  const cryptoAssets = assets.filter(
    (a): a is Asset & { coingecko_id: string } =>
      a.type === 'crypto' && a.coingecko_id !== null
  )

  const ids = cryptoAssets.map(a => a.coingecko_id)

  const [cryptoData, goldData, usdKes] = await Promise.all([
    fetchCryptoPrices(ids),
    fetchGoldPrice(),
    fetchUsdKesRate()
  ])

  const cryptoPrices: MarketPrice[] = cryptoData.map((c: CoinGeckoMarket) =>
    normalizeCrypto(c, usdKes)
  )

  const gold: MarketPrice = {
    symbol: 'XAU',
    price_usd: goldData.price_usd,
    price_kes: goldData.price_usd * usdKes,
    change_24h: goldData.change_24h,
    last_updated: goldData.last_updated
  }

  return [...cryptoPrices, gold]
}