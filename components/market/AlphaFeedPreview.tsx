'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { BadgeCheck, TrendingUp, MessageCircle, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { FeedPost } from '@/lib/supabase/types'

interface AlphaFeedPreviewProps {
  limit?: number
}

async function fetchAlphaPosts(limit: number = 5): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      media_url,
      likes_count,
      comments_count,
      shares_count,
      assetSymbols,
      signalType,
      profiles!inner (
        id,
        username,
        full_name,
        avatar_url,
        is_verified,
        monthly_roi
      ),
      trade_tags (
        asset_symbol,
        signal_type,
        price,
        change,
        direction
      )
    `)
    .gte('profiles.monthly_roi', 15)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data || []) as unknown as FeedPost[]
}

export default function AlphaFeedPreview({ limit = 5 }: AlphaFeedPreviewProps) {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['alpha-feed', limit],
    queryFn: () => fetchAlphaPosts(limit),
    staleTime: 1000 * 30, // 30 seconds
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-slate-900/60 bg-slate-900/20 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-900/60 bg-slate-900/20 p-6 text-center">
        <p className="text-sm text-slate-500">No alpha setups available yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2 select-none">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
          High-Conviction Setups
        </h3>
      </div>

      <div className="space-y-2.5">
        {posts.map((post) => {
          const profile = post.profiles
          const cleanUsername = profile?.username?.replace('@', '') || 'anonymous'
          const initials = profile?.full_name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || cleanUsername.slice(0, 2).toUpperCase()

          const assetSymbol = post.trade_tags?.asset_symbol || post.assetSymbols?.[0]
          const signalType = post.trade_tags?.signal_type || post.signalType

          return (
            <Link
              key={post.id}
              href={`/user/${cleanUsername}`}
              className="block rounded-2xl border border-slate-900/60 bg-slate-900/20 p-4 transition-all duration-200 hover:border-slate-800 hover:bg-slate-900/30 group"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="shrink-0">
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.username || 'User'}
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

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-slate-100 truncate">
                        @{profile?.username || 'anonymous'}
                      </span>
                      {profile?.is_verified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-yellow-600 stroke-slate-950" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                      +{profile?.monthly_roi || 0}%
                    </span>
                  </div>

                  {/* Signal Badge */}
                  {assetSymbol && signalType && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {assetSymbol}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                          signalType === 'Bullish'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : signalType === 'Bearish'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {signalType}
                      </span>
                    </div>
                  )}

                  {/* Content Preview */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Engagement */}
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{post.comments_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        href="/"
        className="block w-full text-center py-2 text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors"
      >
        View All Setups →
      </Link>
    </div>
  )
}