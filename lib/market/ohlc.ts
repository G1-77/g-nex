// lib/market/ohlc.ts

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' | '1M'

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

const timeframeToDays: Record<Timeframe, number> = {
  '1m': 1,
  '5m': 1,
  '15m': 1,
  '1H': 1,
  '4H': 7,
  '1D': 30,
  '1W': 90,
  '1M': 365
}

const symbolToCoinGeckoId: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  USDT: 'tether'
}

export async function fetchOHLCData(
  symbol: string,
  timeframe: Timeframe = '1D'
): Promise<OHLCData[]> {
  const coinId = symbolToCoinGeckoId[symbol]
  if (!coinId) throw new Error('Unsupported asset: ' + symbol)

  const days = timeframeToDays[timeframe]
  const url = 'https://api.coingecko.com/api/v3/coins/' + coinId + '/ohlc?vs_currency=usd&days=' + days
  
  const response = await fetch(url, { next: { revalidate: 300 } })
  if (!response.ok) throw new Error('CoinGecko API error')
  
  const data: number[][] = await response.json()
  return data.map((c) => ({
    time: Math.floor(c[0] / 1000),
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4]
  }))
}

export async function fetchCurrentPrice(symbol: string): Promise<number> {
  const coinId = symbolToCoinGeckoId[symbol]
  if (!coinId) throw new Error('Unsupported asset')

  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + coinId + '&vs_currencies=usd'
  const response = await fetch(url, { next: { revalidate: 30 } })
  const data = await response.json()
  return data[coinId].usd
}

// ---------------------------------------------------------------------------
// Gold OHLC — real candles from the xaus.com history endpoint. There is no
// synthetic fallback: if upstream fails the chart shows an explicit
// unavailable state instead of fabricated candles.
// ---------------------------------------------------------------------------

const XAUS_HISTORY_URL = 'https://xaus.com/api/v1/history'

interface XausHistoryPoint {
  d: string | number
  c: number
  h?: number
  l?: number
}

const goldTimeframeToDays: Record<Timeframe, number> = {
  '1m': 1,
  '5m': 1,
  '15m': 3,
  '1H': 7,
  '4H': 30,
  '1D': 90,
  '1W': 365,
  '1M': 1095
}

export async function fetchGoldOHLC(timeframe: Timeframe = '1D'): Promise<OHLCData[]> {
  const days = goldTimeframeToDays[timeframe]
  const url = `${XAUS_HISTORY_URL}?days=${days}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 }
    })
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) throw new Error('Gold history API error')

  const payload = (await response.json()) as { points?: XausHistoryPoint[] }
  const points = payload.points ?? []
  if (points.length === 0) throw new Error('No gold history returned')

  // Upstream provides daily bars ordered oldest→newest. Trim to the window.
  const trimmed = points.slice(-days)
  return trimmed.map((p, i) => {
    const ts = typeof p.d === 'number' ? p.d : Date.parse(String(p.d))
    const time = Math.floor((Number.isFinite(ts) ? ts : Date.now() - (trimmed.length - i) * 86_400_000) / 1000)
    const open = i > 0 ? trimmed[i - 1].c : p.c
    return {
      time,
      open,
      high: Math.max(open, p.c, p.h ?? p.c),
      low: Math.min(open, p.c, p.l ?? p.c),
      close: p.c
    }
  })
}

export function getIntervalMs(timeframe: Timeframe): number {
  const intervals: Record<Timeframe, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1H': 3600000,
    '4H': 14400000,
    '1D': 86400000,
    '1W': 604800000,
    '1M': 2592000000
  }
  return intervals[timeframe]
}
