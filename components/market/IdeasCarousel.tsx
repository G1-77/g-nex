'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { BadgeCheck, MessageCircle, Rocket } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import SparklineArea from '@/components/market/SparklineArea'
import { useToggleLikeMutation } from '@/lib/react-query/mutations/feed.mutations'
import { useAuth } from '@/components/providers/AuthProvider'
import type { FeedPost, SignalType } from '@/lib/supabase/types'
import { normalizeTradeTags } from '@/lib/supabase/types'
import type { MarketTicker } from '@/lib/supabase/market.types'

const UP_COLOR = '#8DFF45'
const DOWN_COLOR = '#FF5A5A'
const NEUTRAL_COLOR = '#F59E0B'

function formatRoi(value: number | null | undefined): { text: string; color: string } {
  const roi = Number(value ?? 0)
  return {
    text: `${roi > 0 ? '+' : ''}${roi}%`,
    color: roi < 0 ? 'text-rose-400' : 'text-emerald-400',
  }
}

type IdeasMode = 'for-you' | 'picks'

const MODES: { id: IdeasMode; label: string }[] = [
  { id: 'for-you', label: 'For you' },
  { id: 'picks', label: "Editors' picks" },
]

function signalColor(signal: SignalType | null | undefined): string {
  if (signal === 'Bullish') return UP_COLOR
  if (signal === 'Bearish') return DOWN_COLOR
  return NEUTRAL_COLOR
}

async function fetchIdeaPosts(mode: IdeasMode, limit = 10): Promise<FeedPost[]> {
  if (mode === 'picks') {
    // Editors' picks: real editorial_picks (curated by editors), not a ROI filter.
    const { data, error } = await supabase
      .from('editorial_picks')
      .select(`
        id,
        post:posts (
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
        )
      `)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(limit)

    if (error) throw new Error(error.message)

    const rows = ((data ?? []) as unknown as Array<{ post: FeedPost | null }>)
      .map((pick) => pick.post)
      .filter((p): p is FeedPost => Boolean(p))

    return rows.map((row) => ({
      ...row,
      trade_tags: normalizeTradeTags(row.trade_tags),
    })) as unknown as FeedPost[]
  }

  const query = supabase
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

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data || []).map((row) => ({
    ...row,
    trade_tags: normalizeTradeTags(row.trade_tags),
  })) as unknown as FeedPost[]
}

interface IdeasCarouselProps {
  tickers?: MarketTicker[]
}

export default function IdeasCarousel({ tickers }: IdeasCarouselProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [mode, setMode] = useState<IdeasMode>('for-you')
  const [likeOverrides, setLikeOverrides] = useState<Record<string, boolean>>({})
  const toggleLike = useToggleLikeMutation()

  const { data: posts, isLoading } = useQuery({
    queryKey: ['ideas-carousel', mode],
    queryFn: () => fetchIdeaPosts(mode),
    staleTime: 1000 * 30,
  })

  const sparklineBySymbol = useMemo(() => {
    const map: Record<string, number[]> = {}
    tickers?.forEach((ticker) => {
      map[ticker.symbol] = ticker.sparkline
    })
    return map
  }, [tickers])

  function fallbackSparkline(post: FeedPost): number[] {
    const tag = post.trade_tags
    const price = tag?.price != null ? Number(tag.price) : null
    const change = tag?.change != null ? Number(tag.change) : null
    if (!price) return [1, 1.04, 1.02, 1.06, 1.03, 1.05]
    const prev = change ? price / (1 + change / 100) : price * 0.98
    return [prev * 0.995, prev * 1.005, prev * 0.99, price * 0.997, price]
  }

  function handleLike(post: FeedPost) {
    if (!user?.id) return
    const postAuthorId = post.profiles?.id || ''
    setLikeOverrides((prev) => ({
      ...prev,
      [post.id]: !(prev[post.id] ?? post.isLikedByCurrentUser ?? false),
    }))
    toggleLike.mutate(
      { postId: post.id, userId: user.id, postAuthorId },
      {
        onError: () => {
          setLikeOverrides((prev) => ({ ...prev, [post.id]: false }))
        },
      }
    )
  }

  const title = (
    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
      Ideas <span className="text-slate-600">&gt;</span>
    </h2>
  )

  return (
    <div>
      {title}

      <div className="mt-3 flex items-center gap-1">
        {MODES.map((m) => {
          const active = mode === m.id

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
                active
                  ? 'border-amber-500/30 bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/10'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-56 w-64 shrink-0 animate-pulse rounded-2xl border border-slate-900/60 bg-slate-900/20"
              />
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <p className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-6 text-center font-mono text-xs text-slate-500">
            No ideas yet — be the first to publish a setup.
          </p>
        ) : (
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {posts.map((post) => {
              const profile = post.profiles
              const cleanUsername = profile?.username?.replace('@', '') || 'anonymous'
              const initials =
                profile?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || cleanUsername.slice(0, 2).toUpperCase()

              const assetSymbol = post.trade_tags?.asset_symbol || post.assetSymbols?.[0]
              const signal = post.trade_tags?.signal_type || post.signalType || null
              const color = signalColor(signal)
              const sparkline =
                (assetSymbol ? sparklineBySymbol[assetSymbol] : undefined) ??
                fallbackSparkline(post)

              const liked =
                likeOverrides[post.id] ?? post.isLikedByCurrentUser ?? false
              const likesCount = Math.max(0, post.likes_count + (liked ? 1 : 0))

              return (
                <article
                  key={post.id}
                  onClick={() => router.push(`/user/${cleanUsername}`)}
                  className="w-64 shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl border border-slate-900/60 bg-slate-900/20 transition-all duration-200 hover:border-slate-700/60"
                >
                  {/* 16:9 chart preview with overlapping asset badge */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                    <SparklineArea
                      data={sparkline}
                      color={color}
                      height={64}
                      className="absolute inset-0 h-full w-full"
                    />

                    {assetSymbol && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/90 px-1.5 py-0.5 backdrop-blur-sm">
                        <Image
                          src={`/icons/${assetSymbol.toLowerCase()}.svg`}
                          alt=""
                          width={12}
                          height={12}
                          className="h-3 w-3"
                        />
                        <span className="font-mono text-[10px] font-black text-slate-200">
                          {assetSymbol}
                        </span>
                      </span>
                    )}

                    {signal && (
                      <span
                        className="absolute right-2 top-2 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-black uppercase backdrop-blur-sm"
                        style={{
                          color,
                          borderColor: `${color}44`,
                          backgroundColor: `${color}14`,
                        }}
                      >
                        {signal}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="space-y-2 p-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                        {profile?.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt={profile.username || 'User'}
                            fill
                            sizes="24px"
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <span className="font-mono text-[8px] font-black text-slate-400">
                            {initials}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 truncate text-xs font-bold text-slate-100">
                        @{profile?.username || 'anonymous'}
                      </span>
                      {profile?.is_verified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-yellow-600 stroke-slate-950" />
                      )}
                      <span className={`ml-auto shrink-0 font-mono text-[10px] font-black ${formatRoi(profile?.monthly_roi).color}`}>
                        {formatRoi(profile?.monthly_roi).text}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-100">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        aria-label={liked ? 'Unlike idea' : 'Like idea'}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLike(post)
                        }}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black transition-all duration-150 active:scale-90 ${
                          liked
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            : 'border-slate-800 bg-slate-950/60 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <Rocket className={`h-3 w-3 ${liked ? 'fill-amber-400' : ''}`} />
                        <span className="font-mono tabular-nums">{likesCount}</span>
                      </button>

                      <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500">
                        <MessageCircle className="h-3 w-3" />
                        <span className="font-mono tabular-nums">
                          {post.comments_count}
                        </span>
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}