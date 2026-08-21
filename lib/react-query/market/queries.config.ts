'use client'

// lib/react-query/market/queries.config.ts
// Display/bounds configuration channel. Values come from the authoritative
// platform_settings store via GET /api/platform/config and are used ONLY for
// UI labels and client-side pre-validation — the server re-derives everything
// at execution time.

import { useQuery } from '@tanstack/react-query'
import type { PlatformConfig } from '@/lib/admin/settings'

export const FALLBACK_PLATFORM_CONFIG: PlatformConfig = {
  tradingFeeRate: 0.02,
  withdrawalFeeRate: 0.03,
  minTradeUsd: 1,
  maxTradeUsd: 50_000,
}

export function usePlatformConfigQuery() {
  return useQuery({
    queryKey: ['platform-config'] as const,
    queryFn: async (): Promise<PlatformConfig> => {
      const res = await fetch('/api/platform/config')
      if (!res.ok) throw new Error('Platform config unavailable')
      return (await res.json()) as PlatformConfig
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
    placeholderData: FALLBACK_PLATFORM_CONFIG,
  })
}
