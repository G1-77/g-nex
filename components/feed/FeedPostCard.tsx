'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck, MessagesSquare, Pencil, Share2, ThumbsUp, Trash2 } from 'lucide-react'

import Sparkline from '@/components/market/Sparkline'
import { useToggleLikeMutation, useSharePostMutation, useEditPostMutation, useDeletePostMutation } from '@/lib/react-query/mutations/feed.mutations'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import { usePriceHistory } from '@/lib/market/binance-realtime'
import type { FeedPost } from '@/lib/supabase/types'
import type { AssetSymbol } from '@/lib/supabase/types'

import { useAuth } from '../providers/AuthProvider'
import CommentDrawer from './CommentDrawer'
import FollowersPopup from './FollowersPopup'
import { useToggleFollowMutation } from '@/lib/react-query/mutations/follow.mutations'
// import { ReputationBadge } from '@/components/reputation/ReputationBadge'
import { EditPostModal } from './EditPostModal'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [followersOpen, setFollowersOpen] = useState(false)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(
    post.profiles?.isFollowingByViewer ?? false
  )

  const toggleLikeMutation = useToggleLikeMutation()

  const toggleFollowMutation = useToggleFollowMutation()

  const shareMutation = useSharePostMutation()
  const editMutation = useEditPostMutation()
  const deleteMutation = useDeletePostMutation()

  const isOwnPost = user?.id === post.profiles?.id

  const handleShareClick = () => {
    if (!user) {
      alert('Please sign in to share posts.')
      return
    }
    if (shareMutation.isPending) return
    shareMutation.mutate(post.id)
  }

  const handleDeleteClick = () => {
    if (!window.confirm('Delete this post permanently? This cannot be undone.')) return
    deleteMutation.mutate(post.id)
    setMenuOpen(false)
  }

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

    toggleFollowMutation.mutate(
      {
        followerId: user.id,
        followingId: post.profiles?.id || '',
      },
      {
        onSuccess: (result) => setIsFollowing(result.followed),
      }
    )
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

              {/* <ReputationBadge
                status={post.profiles?.reputation_status ?? null}
                score={post.profiles?.reputation_score ?? null}
              /> */}
            </div>

            <div className="relative mt-1 w-fit">
              <button
                type="button"
                onClick={() => setFollowersOpen((v) => !v)}
                className="cursor-pointer text-xs text-slate-500 transition-colors hover:text-slate-300 hover:underline"
                title="View followers"
              >
                {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
              </button>

              <FollowersPopup
                userId={post.profiles?.id ?? ''}
                count={followersCount}
                isOpen={followersOpen}
                onOpenChange={setFollowersOpen}
              />
            </div>

            <Link
              href={`/user/${cleanUsername}/activities`}
              className="mt-0.5 w-fit cursor-pointer font-mono text-[10px] font-black text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
              title="View trading activities"
            >
              + {post.profiles?.monthly_roi ?? 0}% ROI
            </Link>
          </div>
        </div>

        {isOwnPost ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900/40 text-slate-400 transition hover:text-white cursor-pointer"
              aria-label="Post actions"
            >
              <span className="text-lg leading-none">⋯</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setEditOpen(true)
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Post
                </button>

                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={deleteMutation.isPending}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        ) : (
        user && user.id !== post.profiles?.id && (
          <button
            type="button"
            onClick={handleFollowClick}
            disabled={toggleFollowMutation.isPending}
            className={`rounded-full border px-3.5 py-1 text-[11px] font-black  tracking-wider transition-all duration-150 active:scale-95 cursor-pointer shadow-sm ${
              toggleFollowMutation.isPending
                ? 'border-slate-800 bg-slate-900/20 text-slate-600 pointer-events-none'
                : isFollowing
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:border-rose-500/50 hover:text-rose-300'
                  : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-yellow-600/40 hover:text-yellow-600'
            }`}
          >
            {toggleFollowMutation.isPending ? 'Syncing...' : isFollowing ? 'unfollow' : 'follow'}
          </button>
        )
        )}

      </div>

      <div className="mt-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {post.content}
        </p>
      </div>

      {post.media_url && (
        <div
          className="mt-4 w-full overflow-hidden rounded-xl border border-slate-800/40 bg-slate-900/20 group"
          onMouseEnter={() => setMediaPreviewOpen(true)}
          onMouseLeave={() => setMediaPreviewOpen(false)}
        >
          <Image
            src={post.media_url}
            alt="Trading intelligence chart layout attachment"
            width={450}
            height={450}
            className="aspect-video w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
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
          <div
            className="relative flex items-center justify-between"
            onMouseEnter={() => setAssetPreviewOpen(true)}
            onMouseLeave={() => setAssetPreviewOpen(false)}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
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

            {assetPreviewOpen && assetMeta && (
              <div className="pointer-events-none absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl shadow-black backdrop-blur-xl animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <Image
                    src={assetLogo as string}
                    width={32}
                    height={32}
                    alt={assetMeta.name}
                    className="h-8 w-8 shrink-0 rounded-full"
                  />

                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold text-white">
                      {assetMeta.symbol}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {assetMeta.name}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
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

                <div className="mt-2 flex items-center justify-between gap-3">
                  <Sparkline
                    data={sparkData}
                    color={assetPositive ? CHANGE_POSITIVE : CHANGE_NEGATIVE}
                    width={110}
                    height={26}
                  />

                  <Link
                    href={`/markets/${assetMeta.symbol.toLowerCase()}`}
                    className="shrink-0 rounded-lg border border-yellow-600/30 bg-yellow-600/10 px-2.5 py-1.5 text-[10px] font-black text-yellow-600 transition-colors hover:bg-yellow-600/20"
                  >
                    View Market
                  </Link>
                </div>
              </div>
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
          onClick={handleShareClick}
          disabled={shareMutation.isPending}
          className="flex flex-1 items-center justify-center cursor-pointer gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/40 hover:text-slate-300"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
          {(post.shares_count ?? 0) > 0 && (
            <span className="ml-1 rounded-md bg-slate-900 border border-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-400 animate-fadeIn">
              {post.shares_count}
            </span>
          )}
        </button>
      </div>

       {mediaPreviewOpen && post.media_url && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fadeIn"
          onMouseEnter={() => setMediaPreviewOpen(true)}
          onMouseLeave={() => setMediaPreviewOpen(false)}
        >
          <Image
            src={post.media_url}
            alt="Trading intelligence chart layout attachment preview"
            width={1200}
            height={675}
            className="max-h-[90vh] w-auto max-w-full rounded-xl border border-slate-800 object-contain shadow-2xl"
          />
        </div>
      )}

      <CommentDrawer
        postId={post.id}
        isOpen={commentOpen}
        onClose={() =>
          setCommentOpen(false)
        }
      />

      <EditPostModal
        post={post}
        isOpen={editOpen}
        isSaving={editMutation.isPending}
        onClose={() => setEditOpen(false)}
        onSave={(content) => {
          editMutation.mutate(
            {
              postId: post.id,
              content,
              assetSymbols: post.assetSymbols,
              signalType: post.signalType,
            },
            {
              onSuccess: () => setEditOpen(false),
              onError: (error) => alert(error.message),
            }
          )
        }}
      />
    </article>
  )
}