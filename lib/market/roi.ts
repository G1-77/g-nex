// lib/market/roi.ts
// Shared, typed surface for the daily-computed trader ROI (30-day realized
// P&L / total confirmed deposits). The value is materialized by the DB RPC
// `get_user_roi` (SECURITY DEFINER) — this module only marshals it.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface UserRoi {
  ok: boolean
  roiPct: number
  realizedKes: number
  investedKes: number
  computedAt: string | null
}

interface RoiRpcResult {
  ok?: boolean
  roi_pct?: number | null
  realized_kes?: number | null
  invested_kes?: number | null
  computed_at?: string | null
  error?: string
}

/** Parse a raw get_user_roi payload into the typed shape. */
export function parseRoiResult(data: unknown): UserRoi {
  const raw = (data ?? {}) as RoiRpcResult
  return {
    ok: raw.ok !== false,
    roiPct: Number(raw.roi_pct ?? 0),
    realizedKes: Number(raw.realized_kes ?? 0),
    investedKes: Number(raw.invested_kes ?? 0),
    computedAt: typeof raw.computed_at === 'string' ? raw.computed_at : null,
  }
}

/** Fetch a user's ROI through any Supabase client (server or browser). */
export async function fetchUserRoi(
  supabase: SupabaseClient,
  userId: string,
  force = false
): Promise<UserRoi> {
  const { data, error } = await supabase.rpc('get_user_roi', {
    p_user: userId,
    p_force: force,
  })
  if (error || !data) {
    // Loud, diagnosable failure — callers render an "unavailable" state, never
    // a fake zero. Most common cause: roi_engine migration not applied.
    console.error('get_user_roi failed:', error?.message ?? 'empty payload')
    return { ok: false, roiPct: 0, realizedKes: 0, investedKes: 0, computedAt: null }
  }
  return parseRoiResult(data)
}