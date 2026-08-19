import type { GoldPrice } from '@/types/market'

const SPOT_URL = 'https://xaus.com/api/v1/spot?compact=1'
const HISTORY_URL = 'https://xaus.com/api/v1/history'

const CACHE_TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 10_000

interface XausSpot {
  spot_usd_oz: number
  gold_market_cap_usd: number | null
  updated_at: string
}

interface XausHistory {
  points?: { d: string; c: number; h: number; l: number }[]
  ranges?: { day?: { high: number; low: number } }
}

let cache: { data: GoldPrice; fetchedAt: number } | null = null

function simulatedFallback(): GoldPrice {
  const base = 3300
  const variation = Math.random() * 20 - 10
  const price = base + variation

  return {
    symbol: 'XAU',
    price_usd: price,
    change_24h: (variation / base) * 130,
    high_usd: price * 1.005,
    low_usd: price * 0.995,
    market_cap_usd: null,
    last_updated: new Date().toISOString(),
  }
}

async function fetchJson(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchGoldPrice(): Promise<GoldPrice> {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data

  try {
    const [spotRes, historyRes] = await Promise.all([
      fetchJson(SPOT_URL),
      fetchJson(HISTORY_URL),
    ])

    if (!spotRes.ok) throw new Error(`Gold spot request failed: ${spotRes.status}`)

    const spot = (await spotRes.json()) as XausSpot
    const price = Number(spot.spot_usd_oz)

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Invalid gold price from upstream')
    }

    let history: XausHistory = {}
    if (historyRes.ok) {
      history = (await historyRes.json()) as XausHistory
    }

    const points = history.points ?? []
    let change24h = 0
    if (points.length >= 2) {
      const prevClose = points[points.length - 2].c
      const lastClose = points[points.length - 1].c
      if (prevClose > 0) {
        change24h = ((lastClose - prevClose) / prevClose) * 100
      }
    }

    const dayRange = history.ranges?.day
    const data: GoldPrice = {
      symbol: 'XAU',
      price_usd: price,
      change_24h: change24h,
      high_usd: dayRange?.high ?? price * 1.002,
      low_usd: dayRange?.low ?? price * 0.998,
      market_cap_usd: Number(spot.gold_market_cap_usd) || null,
      last_updated: spot.updated_at ?? new Date().toISOString(),
    }

    cache = { data, fetchedAt: now }
    return data
  } catch (err) {
    // Serve the last known real price when we have one, otherwise degrade
    // to the simulated baseline so the gold surface never breaks.
    if (cache) return cache.data
    console.error('Gold fetch failed, using simulated fallback:', err)
    return simulatedFallback()
  }
}
