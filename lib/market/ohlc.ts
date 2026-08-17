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

export function generateMockIntradayData(
  basePrice: number,
  timeframe: Timeframe,
  points: number = 100
): OHLCData[] {
  const now = Date.now()
  const intervalMs = getIntervalMs(timeframe)
  const data: OHLCData[] = []
  let currentPrice = basePrice

  for (let i = points - 1; i >= 0; i--) {
    const time = Math.floor((now - i * intervalMs) / 1000)
    const volatility = 0.001
    const change = (Math.random() - 0.48) * currentPrice * volatility
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.002)
    const low = Math.min(open, close) * (1 - Math.random() * 0.002)
    
    data.push({ time, open, high, low, close })
    currentPrice = close
  }
  return data
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
