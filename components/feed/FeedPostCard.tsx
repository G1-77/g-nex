'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck, MessagesSquare,Share2,ThumbsUp,} from 'lucide-react'

import Sparkline from '@/components/market/Sparkline'
import { useToggleLikeMutation } from '@/lib/react-query/mutations/feed.mutations'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { usePriceHistory } from '@/lib/market/binance-realtime'
import type { FeedPost } from '@/lib/supabase/types'
import type { AssetSymbol } from '@/lib/supabase/types'

import { useAuth } from '../providers/AuthProvider'
import CommentDrawer from './CommentDrawer'
import { useToggleFollowMutation } from '@/lib/react-query/mutations/follow.mutations'

interface FeedPostCardProps {
  post: FeedPost
}

function getAssetMeta(symbol?: string | null) {
    switch (symbol) {
      case 'BTC':
        return { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' as const }
      case 'ETH':
        return { symbol: 'ETH', name: 'Ethereum', type: 'crypto' as const }
      case 'SOL':
        return { symbol: 'SOL', name: 'Solana', type: 'crypto' as const }
      case 'XRP':
        return { symbol: 'XRP', name: 'Ripple', type: 'crypto' as const }
      case 'USDT':
        return { symbol: 'USDT', name: 'Tether', type: 'crypto' as const }
      case 'XAU':
        return { symbol: 'XAU', name: 'Spot Gold', type: 'gold' as const }
      default:
        return null
    }
}

const CHANGE_POSITIVE = '#8DFF45'
const CHANGE_NEGATIVE = '#FF5A5A'
const STALE_MS = 48 * 60 * 60 * 1000

const SIGNAL_BADGES: Record<string, string> = {
  Bullish: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  Bearish: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
  Accumulation: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  Scalp: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  'Long-Term': 'border-violet-500/20 bg-violet-500/10 text-violet-400',
}

export default function FeedPostCard({ post,}:FeedPostCardProps) {
  const { user } = useAuth()
  const router = useRouter()

  const [commentOpen, setCommentOpen] =
    useState(false)

  const toggleLikeMutation = useToggleLikeMutation()

  const toggleFollowMutation = useToggleFollowMutation()

  const handleFollowClick = () => {
    if (!user) {
      alert('Please sign in to track platform participant portfolios.')
      return
    }
    
    // Safety guard clause to block users from following their own profile rows
    if (user.id === post.profiles?.id) {
      alert('You cannot follow your own analytical tracking portfolio.')
      return
    }

    if (toggleFollowMutation.isPending) return

    toggleFollowMutation.mutate({
      followerId: user.id,
      followingId: post.profiles?.id || '',
    })
  }


  const cleanUsername = post.profiles?.username?.replace('@', '') || 'anonymous'

  const initials = useMemo(() => {
    const fullName = post.profiles?.full_name?.trim()

    if (fullName) {
      const parts = fullName.split(' ').filter(Boolean)

       if (parts.length >= 2) {
        return (`${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`).toUpperCase()
      }

      return parts[0]?.slice(0, 2).toUpperCase() ?? 'GN'
    }

    const username =
      post.profiles?.username?.trim()

    if (username) {
      return username
        .replace('@', '')
        .slice(0, 2)
        .toUpperCase()
    }

    return 'GN'
  }, [post.profiles?.full_name,post.profiles?.username,])

  const hasAvatar = Boolean(post.profiles?.avatar_url?.trim()
  )

  const handleLikeClick = () => {
    if (!user) {
      alert('Please sign in to like posts.' )
      return
    }

    if (toggleLikeMutation.isPending) {
      return
    }

    toggleLikeMutation.mutate({
      postId: post.id,
      userId: user.id,
      postAuthorId:
        post.profiles?.id || '',
    })
  }

  const assetMeta = getAssetMeta(post.trade_tags?.asset_symbol)

  const assetPositive = (post.trade_tags?.direction ?? 'bullish') === 'bullish'
  const direction = post.trade_tags?.direction ?? null
  const signalType = post.trade_tags?.signal_type ?? post.signalType ?? null
  const assetLogo = assetMeta ? `/icons/${assetMeta.symbol.toLowerCase()}.svg` : null

  const { data: liveTickers = [] } = useMarketPrices([])
  const liveTicker = assetMeta
    ? liveTickers.find((t) => t.symbol === assetMeta.symbol)
    : undefined

  const liveHistory = usePriceHistory((assetMeta?.symbol ?? 'BTC') as AssetSymbol)
  const sparkData =
    assetMeta && liveHistory.length >= 2
      ? Array.from(liveHistory)
      : (liveTicker?.sparkline ?? [])

  const livePrice = liveTicker?.priceUsd
  const liveChange = liveTicker?.change24h
  const isLiveChangePositive = liveChange != null ? liveChange >= 0 : assetPositive

  const storedPriceRaw = post.trade_tags?.price
  const storedPrice =
    storedPriceRaw == null || storedPriceRaw === '' ? NaN : Number(storedPriceRaw)

  const displayPrice =
    livePrice != null ? livePrice : Number.isFinite(storedPrice) ? storedPrice : null

  const displayPriceLabel =
    displayPrice != null
      ? `$${displayPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      : 'Polling...'

  const displayChangeLabel =
    liveChange != null
      ? `${liveChange >= 0 ? '+' : ''}${liveChange.toFixed(2)}%`
      : (post.trade_tags?.change ?? '0.00%')

  const deltaLabel =
    Number.isFinite(storedPrice) && livePrice != null && storedPrice > 0
      ? (() => {
          const abs = livePrice - storedPrice
          const pct = (abs / storedPrice) * 100
          const positive = abs >= 0
          return {
            text: `${positive ? '+' : ''}$${abs.toFixed(2)} · ${positive ? '+' : ''}${pct.toFixed(2)}% since signal`,
            positive,
          }
        })()
      : null

  const [isStale] = useState(
    () => Date.now() - new Date(post.created_at).getTime() > STALE_MS
  )

  const handleTrade = () => {
    if (!assetMeta) return
    const side = assetPositive ? 'buy' : 'sell'
    router.push(`/markets/${assetMeta.symbol.toLowerCase()}/trade?side=${side}`)
  }

  const handleChart = () => {
    if (!assetMeta) return
    router.push(`/markets/${assetMeta.symbol.toLowerCase()}`)
  }

  const primaryLabel = assetPositive
    ? assetMeta?.type === 'gold'
      ? 'Accumulate'
      : 'Buy'
    : 'Sell'

  const primaryClass = assetPositive
    ? assetMeta?.type === 'gold'
      ? 'bg-yellow-600 text-slate-950 hover:bg-yellow-500'
      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
    : 'bg-rose-500 text-slate-950 hover:bg-rose-400'

  const followersCount = (post.profiles as { followers_count?: number } | null)?.followers_count ?? 0

  return (
    <article className="rounded-2xl border border-slate-900 bg-slate-900/30 p-5 backdrop-blur-md transition-all duration-200 hover:border-slate-800/60 shadow-xl shadow-black/5">
      <div className="flex items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/user/${cleanUsername}`}
            className="shrink-0 block"
          >
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-900 bg-slate-900">
              {hasAvatar ? (
                <Image
                  src={ post.profiles ?.avatar_url as string }
                  alt={ post.profiles?.username ?? 'Profile'}
                  fill
                  sizes="40px"
                  className="rounded-full object-cover"
                  priority
                />
              ) : (
                <span className="text-xs font-black text-slate-400 font-mono">
                  {initials}
                </span>
              )}
            </div>
          </Link>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/user/${cleanUsername}`}
                className="text-sm font-bold text-slate-100 hover:text-white hover:underline transition-colors truncate max-w-27.5"
              >
                @{post.profiles?.username ?? 'anonymous'}
              </Link>

              {post.profiles ?.is_verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 fill-yellow-600 stroke-slate-950 text-slate-950" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                 {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
              </span>

              <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                + {post.profiles?.monthly_roi ?? 0}% ROI
              </span>
            </div>
          </div>
        </div>

        {user && user.id !== post.profiles?.id && (
          <button
            type="button"
            onClick={handleFollowClick}
            disabled={toggleFollowMutation.isPending}
            className={`rounded-full border px-3.5 py-1 text-[11px] font-black  tracking-wider transition-all duration-150 active:scale-95 cursor-pointer shadow-sm ${
              // Note: Once Phase 3C hydrates a full following look-up hash map array inside getFeedPosts,
              // we can swap this local condition for a persistent boolean state check cleanly!
              toggleFollowMutation.isPending
                ? 'border-slate-800 bg-slate-900/20 text-slate-600 pointer-events-none'
                : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-yellow-600/40 hover:text-yellow-600'
            }`}
          >
            {toggleFollowMutation.isPending ? 'Syncing...' : 'follow'}
          </button>
        )}

      </div>

      <div className="mt-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {post.content}
        </p>
      </div>

      {post.media_url && (
        <div className="mt-4 w-full overflow-hidden rounded-xl border border-slate-800/40 bg-slate-900/20 group">
          <Image
            src={post.media_url}
            alt="Trading intelligence chart layout attachment"
            width={450}
            height={450}
            className="aspect-[16/9] w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
            loading="lazy"
          />
        </div>
      )}

      {assetMeta && (
        <div
          className={`mt-5 rounded-2xl border border-slate-900 bg-slate-950/40 p-4 shadow-inner ${
            isStale ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src={assetLogo as string}
                width={28}
                height={28}
                alt={assetMeta.name}
                className="h-7 w-7 shrink-0 rounded-full"
              />

              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {assetMeta.symbol}
                  </span>

                  <span className="truncate text-xs text-slate-500">
                    {assetMeta.name}
                  </span>

                  {direction && (
                    <span
                      className={`text-sm font-black ${
                        assetPositive ? 'text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {assetPositive ? '↑' : '↓'}
                    </span>
                  )}
                </div>

                {signalType && SIGNAL_BADGES[signalType] && (
                  <span
                    className={`mt-0.5 w-fit rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      SIGNAL_BADGES[signalType]
                    }`}
                  >
                    {signalType}
                  </span>
                )}
              </div>
            </div>

            {isStale && (
              <span className="shrink-0 rounded-md border border-slate-800 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">
                Expired
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white">
                  {displayPriceLabel}
                </span>

                <span
                  className={`text-sm font-bold ${
                    isLiveChangePositive ? 'text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {displayChangeLabel}
                </span>
              </div>

              {deltaLabel && (
                <span
                  className={`mt-0.5 font-mono text-[10px] font-bold ${
                    deltaLabel.positive ? 'text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {deltaLabel.text}
                </span>
              )}
            </div>

            <Sparkline
              data={sparkData}
              color={assetPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE}
              width={64}
              height={20}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleTrade}
              className={`flex-1 cursor-pointer rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${primaryClass}`}
            >
              {primaryLabel}
            </button>

            <button
              type="button"
              onClick={handleChart}
              className="cursor-pointer rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
            >
              Chart
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-900/60 pt-3">
       <button
          type="button"
          onClick={handleLikeClick}
          disabled={toggleLikeMutation.isPending}
          className={`flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-xl py-2 text-xs font-semibold transition-all ${
            post.isLikedByCurrentUser
              ? 'bg-yellow-600/5 text-yellow-600 font-bold'
              : 'text-slate-500 hover:bg-slate-900/40 hover:text-slate-300'
          }`}
        >
          <ThumbsUp
            className={`h-4 w-4 transition-transform ${
              post.isLikedByCurrentUser
                ? 'fill-yellow-600 stroke-none text-yellow-600'
                : ''
            }`}
          />
          <span>Like</span>
          
          {post.likes_count > 0 && (
            <span className="ml-1 rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-slate-800/40 animate-fadeIn">
              {post.likes_count}
            </span>
          )}
        </button>


        <button
          type="button"
          onClick={() =>
            setCommentOpen(true)
          }
          className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-xl py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/40 hover:text-slate-300"
        >
          <MessagesSquare className="h-4 w-4" />
          <span>Comment</span>
          {(post.comments_count ?? 0) > 0 && (
            <span className="ml-1 rounded-md bg-slate-900 border border-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-400 animate-fadeIn">
              {post.comments_count}
            </span>
          )}
          
        </button>

        <button
          type="button"
          className="flex flex-1 items-center justify-center cursor-pointer gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/40 hover:text-slate-300"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>

       <CommentDrawer
        postId={post.id}
        isOpen={commentOpen}
        onClose={() =>
          setCommentOpen(false)
        }
      />
    </article>
  )
}