// lib/market/coingecko.ts

import type { CoinGeckoMarket } from '@/types/market'

export async function fetchCryptoPrices(
  ids: string[]
): Promise<CoinGeckoMarket[]> {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=usd&ids=${ids.join(',')}&price_change_percentage=24h`

  const res = await fetch(url, {
    next: { revalidate: 60 }
  })

  if (!res.ok) {
    throw new Error('CoinGecko fetch failed')
  }

  const data: unknown = await res.json()

  // runtime safety check (minimal but important)
  if (!Array.isArray(data)) {
    throw new Error('Invalid CoinGecko response')
  }

  return data as CoinGeckoMarket[]
}