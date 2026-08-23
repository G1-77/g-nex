// lib/react-query/home.queries.ts
// Home intelligence queries — activity, sentiment, opportunities, trader suggestions

'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

// ============================================================
// Types
// ============================================================

export interface ActivityEvent {
    id: string
    username: string
    avatar_url: string | null
    asset_symbol: string
    action: 'position_opened' | 'position_closed' | 'analysis_published'
    direction: 'Long' | 'Short' | 'bullish' | 'bearish' | null
    created_at: string
}

export interface SentimentResult {
    bullish: number | null
    bearish: number | null
    neutral: number | null
    total_weight: number
}

export interface SentimentOverviewRow {
    asset_symbol: string
    bullish: number | null
    neutral: number | null
    bearish: number | null
    total_weight: number
}

export interface OpportunityRow {
    asset_symbol: string
    discussions: number
    bullish_signals: number
    bearish_signals: number
}

// ============================================================
// Activity Feed
// ============================================================

export function useMarketActivity(limit = 12) {
    return useQuery({
        queryKey: ['market-activity', limit],
        queryFn: async (): Promise<ActivityEvent[]> => {
            const { data, error } = await supabase.rpc('get_market_activity', { p_limit: limit })
            if (error) throw new Error(error.message)
            return data ?? []
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    })
}

// ============================================================
// Sentiment
// ============================================================

export function useAssetSentiment(assetSymbol: string) {
    return useQuery({
        queryKey: ['sentiment', assetSymbol],
        enabled: !!assetSymbol,
        queryFn: async (): Promise<SentimentResult> => {
            const { data, error } = await supabase.rpc('get_asset_sentiment', { p_asset_symbol: assetSymbol })
            if (error) throw new Error(error.message)
            return data ?? { bullish: null, bearish: null, neutral: null, total_weight: 0 }
        },
        staleTime: 5 * 60_000,
    })
}

export function useSentimentOverview(limit = 6) {
    return useQuery({
        queryKey: ['sentiment-overview', limit],
        queryFn: async (): Promise<SentimentOverviewRow[]> => {
            const { data, error } = await supabase.rpc('get_sentiment_overview', { p_limit: limit })
            if (error) throw new Error(error.message)
            return data ?? []
        },
        staleTime: 5 * 60_000,
    })
}

// ============================================================
// Market Opportunities
// ============================================================

export function useMarketOpportunities(limit = 8) {
    return useQuery({
        queryKey: ['market-opportunities', limit],
        queryFn: async (): Promise<OpportunityRow[]> => {
            const { data, error } = await supabase.rpc('get_market_opportunities', { p_limit: limit })
            if (error) throw new Error(error.message)
            return data ?? []
        },
        staleTime: 60_000,
    })
}

// ============================================================
// Trader Suggestions (client-side deterministic)
// ============================================================

import { useGetFollowersQuery } from '@/lib/react-query/queries/followers.queries'
import { useTopTraders } from '@/lib/react-query/queries/traders.queries'
import { useAuth } from '@/components/providers/AuthProvider'

export function useTraderSuggestions(limit = 5) {
    const { profile } = useAuth()
    const { data: followingData } = useGetFollowersQuery(profile?.id ?? '')
    const { data: topTraders } = useTopTraders(10)

    const followedIds = new Set(followingData?.map(f => f.id) ?? [])
    if (profile?.id) followedIds.add(profile.id)

    const suggestions = topTraders
        ?.filter(t => !followedIds.has(t.id))
        .slice(0, limit) ?? []

    return suggestions
}