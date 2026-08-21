// GET /api/market/ohlc?symbol=BTC&timeframe=1m
//
// Server-proxied OHLC candles. Crypto rides Binance klines (CoinGecko as
// outage fallback), gold rides the xaus history endpoint — both cached
// server-side so browsers never hit the providers directly.

import { fetchOHLCData, fetchGoldOHLC, timeframesForSymbol } from '@/lib/market/ohlc'
import type { Timeframe } from '@/lib/market/ohlc'

const VALID_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M']

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') ?? '').toUpperCase()
  const timeframeParam = url.searchParams.get('timeframe') ?? '1D'

  if (!symbol) return new Response('Missing symbol', { status: 400 })
  if (!VALID_TIMEFRAMES.includes(timeframeParam as Timeframe)) {
    return new Response('Invalid timeframe', { status: 400 })
  }
  const timeframe = timeframeParam as Timeframe

  // Gold cannot honestly serve intraday bars — reject instead of mislabeling.
  if (!timeframesForSymbol(symbol).includes(timeframe)) {
    return new Response('Timeframe not available for this asset', { status: 400 })
  }

  try {
    const candles =
      symbol === 'XAU' ? await fetchGoldOHLC(timeframe) : await fetchOHLCData(symbol, timeframe)
    return Response.json({ symbol, timeframe, candles }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chart data unavailable'
    return new Response(message, { status: 503 })
  }
}
