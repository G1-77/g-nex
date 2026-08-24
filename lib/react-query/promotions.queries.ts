'use client'

// lib/react-query/promotions.queries.ts
// Home promotion carousel data channel. Fetches the ACTIVE promotion
// collection once from GET /api/promotions (server-resolved eligibility) and
// caches it — the carousel rotates through this local dataset, never
// re-requesting per slide.

import { useQuery } from '@tanstack/react-query'
import type { PromotionPayload } from '@/app/api/promotions/route'
import type { AssetSymbol } from '@/lib/supabase/types'

export type { PromotionPayload }

export const promotionKeys = {
  all: ['promotions'] as const,
  active: () => [...promotionKeys.all, 'active'] as const,
}

export function useActivePromotions() {
  return useQuery({
    queryKey: promotionKeys.active(),
    queryFn: async (): Promise<PromotionPayload[]> => {
      const res = await fetch('/api/promotions')
      if (!res.ok) throw new Error('Promotions unavailable')
      const data = (await res.json()) as { promotions: PromotionPayload[] }
      return data.promotions
    },
    staleTime: 60_000,
    retry: 1,
  })
}

// ===========================================================================
// PRODUCT ROUTE REGISTRY — single source mapping GNEX product slugs to their
// in-app routes. Promotions reference product_id; the component never
// hardcodes destinations. A product without a live route resolves to null and
// the CTA renders as an honest "coming soon" state.
// ===========================================================================

/** Products that exist as real destinations today. */
export const PRODUCT_ROUTES: Record<string, string> = {
  prediction: '/prediction',
}

/**
 * Resolve a promotion destination to a concrete internal route, or null when
 * the destination is not navigable (external links open via anchor semantics
 * in the component; 'none' renders an informational card).
 */
export function resolvePromotionRoute(promotion: PromotionPayload): string | null {
  if (promotion.destinationType === 'route' && promotion.destinationUrl) {
    return promotion.destinationUrl
  }
  if (promotion.destinationType === 'product') {
    if (!promotion.productId) return null
    return PRODUCT_ROUTES[promotion.productId] ?? promotion.destinationUrl ?? null
  }
  return null
}

// ===========================================================================
// WATCHLIST TICKER HELPERS — shared by the Favourite Asset quick-action card
// so Home consumes the same cached market pipeline as Markets/Asset Detail.
// ===========================================================================

export interface WatchlistTickerView {
  symbol: AssetSymbol
  name: string
  logo: string
  priceUsd: number
  change24h: number
  sparkline: number[]
}

export function buildWatchlistViews(
  tickers: WatchlistTickerView[],
  symbols: AssetSymbol[]
): WatchlistTickerView[] {
  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))
  return symbols
    .map((symbol) => bySymbol.get(symbol))
    .filter((t): t is WatchlistTickerView => Boolean(t))
}
