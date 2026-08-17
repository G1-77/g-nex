'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { BadgeCheck, TrendingUp, TrendingDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { AssetSymbol } from '@/lib/supabase/types'

interface VerifiedPosition {
  userId: string
  username: string
  avatarUrl: string | null
  monthlyRoi: number
  isVerified: boolean
  assetSymbol: AssetSymbol
  direction: 'Long' | 'Short'
  allocationPercent: number
}

async function fetchVerifiedPositions(): Promise<VerifiedPosition[]> {
  // Fetch top verified traders with open positions
  const { data, error } = await supabase
    .from('user_positions')
    .select(`
      user_id,
      asset_symbol,
      direction,
      units,
      margin_kes,
      profiles!inner (
        id,
        username,
        avatar_url,
        is_verified,
        monthly_roi
      )
    `)
    .eq('status', 'OPEN')
    .eq('profiles.is_verified', true)
    .gte('profiles.monthly_roi', 15)
    .order('profiles.monthly_roi', { ascending: false })
    .limit(10)

  if (error) throw new Error(error.message)
  if (!data) return []

  // Group positions by user and calculate their primary asset allocation
  const userPositions = new Map<string, {
    profile: any
    positions: Array<{ asset_symbol: string; direction: string; margin_kes: number }>
  }>()

  data.forEach((row: any) => {
    const userId = row.user_id
    if (!userPositions.has(userId)) {
      userPositions.set(userId, {
        profile: row.profiles,
        positions: []
      })
    }
    userPositions.get(userId)!.positions.push({
      asset_symbol: row.asset_symbol,
      direction: row.direction,
      margin_kes: Number(row.margin_kes)
    })
  })

  // Calculate primary asset for each user
  const result: VerifiedPosition[] = []
  userPositions.forEach((userData, userId) => {
    const { profile, positions } = userData
    
    // Calculate total margin per asset
    const assetTotals = new Map<string, number>()
    let totalMargin = 0
    
    positions.forEach(pos => {
      const current = assetTotals.get(pos.asset_symbol) || 0
      assetTotals.set(pos.asset_symbol, current + pos.margin_kes)
      totalMargin += pos.margin_kes
    })

    // Find primary asset (highest allocation)
    let primaryAsset = 'BTC' as AssetSymbol
    let maxMargin = 0
    assetTotals.forEach((margin, symbol) => {
      if (margin > maxMargin) {
        maxMargin = margin
        primaryAsset = symbol as AssetSymbol
      }
    })

    const allocationPercent = totalMargin > 0 ? (maxMargin / totalMargin) * 100 : 0
    
    // Get most recent position direction for primary asset
    const primaryPosition = positions.find(p => p.asset_symbol === primaryAsset)
    const direction = primaryPosition?.direction as 'Long' | 'Short' || 'Long'

    result.push({
      userId,
      username: profile.username || 'anonymous',
      avatarUrl: profile.avatar_url,
      monthlyRoi: Number(profile.monthly_roi || 0),
      isVerified: profile.is_verified || false,
      assetSymbol: primaryAsset,
      direction,
      allocationPercent: Math.round(allocationPercent)
    })
  })

  return result.slice(0, 5) // Top 5 traders
}

export default function VerifiedPositioning() {
  const { data: positions, isLoading } = useQuery({
    queryKey: ['verified-positioning'],
    queryFn: fetchVerifiedPositions,
    staleTime: 1000 * 60, // 60 seconds
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-40 rounded bg-slate-900/40 animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-slate-900/60 bg-slate-900/20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-900/60 bg-slate-900/20 p-6 text-center">
        <p className="text-sm text-slate-500">No verified positions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2 select-none">
        <BadgeCheck className="h-4 w-4 text-yellow-600" />
        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
          Verified Positioning
        </h3>
      </div>

      <div className="space-y-2">
        {positions.map((position) => {
          const cleanUsername = position.username.replace('@', '')
          const initials = cleanUsername.slice(0, 2).toUpperCase()
          const isLong = position.direction === 'Long'

          return (
            <Link
              key={position.userId}
              href={`/user/${cleanUsername}`}
              className="block rounded-xl border border-slate-900/60 bg-slate-900/20 p-3 transition-all hover:border-slate-800 hover:bg-slate-900/30 group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="shrink-0">
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                    {position.avatarUrl ? (
                      <Image
                        src={position.avatarUrl}
                        alt={position.username}
                        fill
                        sizes="40px"
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-400 font-mono">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      @{position.username}
                    </span>
                    {position.isVerified && (
                      <BadgeCheck className="h-3 w-3 shrink-0 fill-yellow-600 stroke-slate-950" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                      +{position.monthlyRoi.toFixed(1)}%
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {position.assetSymbol}
                      </span>
                      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                        isLong 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isLong ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{position.direction}</span>
                      </div>
                    </div>
                  </div>

                  {/* Allocation Bar */}
                  <div className="mt-2 w-full h-1 rounded-full bg-slate-900/80 overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${position.allocationPercent}%`,
                        backgroundColor: isLong ? '#8DFF45' : '#FF5A5A'
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">
                    {position.allocationPercent}% exposure
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}