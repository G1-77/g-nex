// GET /api/market/prices?symbols=BTC,ETH
//
// The single authoritative market-price endpoint. Wraps the existing server
// price pipeline (CoinGecko + xaus + exchangerate-api, all cached server-side)
// so browsers never hit providers directly — one shared cache, one symbol map,
// full provenance on every quote.

import { getMarketPriceSnapshot } from '@/lib/market/price-service'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = url.searchParams.get('symbols')
  const symbols = raw
    ? raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 12)
    : undefined

  try {
    const snapshot = await getMarketPriceSnapshot(symbols)
    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Market data unavailable'
    return new Response(message, { status: 503 })
  }
}
