// lib/market/fx.ts

import type { FxResponse } from '@/types/market'

export async function fetchUsdKesRate(): Promise<number> {
  const res = await fetch(
    'https://api.exchangerate-api.com/v4/latest/USD',
    { next: { revalidate: 3600 } }
  )

  if (!res.ok) {
    throw new Error('FX fetch failed')
  }

  const data: FxResponse = await res.json()

  return data.rates.KES
}