'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  MessagesSquare,
  Share2,
  ThumbsUp,
} from 'lucide-react'

import { useToggleLikeMutation } from '@/lib/react-query/mutations/feed.mutations'
import type { FeedPost } from '@/lib/supabase/types'

// import CommentDrawer from './CommentDrawer'
import { useAuth } from '../providers/AuthProvider'

interface FeedPostCardProps {
  post: FeedPost
}

function getAssetMeta(symbol?: string | null) {
  switch (symbol) {
    case 'BTC':
      return {
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto' as const,
      }

    case 'ETH':
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        type: 'crypto' as const,
      }

    case 'SOL':
      return {
        symbol: 'SOL',
        name: 'Solana',
        type: 'crypto' as const,
      }

    case 'XRP':
      return {
        symbol: 'XRP',
        name: 'Ripple',
        type: 'crypto' as const,
      }

    case 'USDT':
      return {
        symbol: 'USDT',
        name: 'Tether',
        type: 'crypto' as const,
      }

    case 'XAU':
      return {
        symbol: 'XAU',
        name: 'Spot Gold',
        type: 'gold' as const,
      }

    default:
      return null
  }
}

export default function FeedPostCard({
  post,
}: FeedPostCardProps) {
  const { user } = useAuth()

  const [commentOpen, setCommentOpen] =
    useState(false)

  const toggleLikeMutation =
    useToggleLikeMutation()

  const cleanUsername =
    post.profiles?.username?.replace(
      '@',
      ''
    ) || 'anonymous'

  const initials = useMemo(() => {
    const fullName =
      post.profiles?.full_name?.trim()

    if (fullName) {
      const parts = fullName
        .split(' ')
        .filter(Boolean)

      if (parts.length >= 2) {
        return (
          `${parts[0]?.[0] ?? ''}${
            parts[
              parts.length - 1
            ]?.[0] ?? ''
          }`
        ).toUpperCase()
      }

      return (
        parts[0]
          ?.slice(0, 2)
          .toUpperCase() ?? 'GN'
      )
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
  }, [
    post.profiles?.full_name,
    post.profiles?.username,
  ])

  const hasAvatar = Boolean(
    post.profiles?.avatar_url?.trim()
  )

  const handleLikeClick = () => {
    if (!user) {
      alert(
        'Please sign in to like posts.'
      )
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

  const assetMeta = getAssetMeta(
    post.trade_tags?.asset_symbol
  )

  const assetPrice =
    post.trade_tags?.price != null
      ? String(post.trade_tags.price)
      : 'Polling...'

  const assetChange =
    post.trade_tags?.change ??
    '0.00%'

  const assetPositive =
    (post.trade_tags?.direction ??
      'bullish') === 'bullish'

  return (
    <article className="rounded-2xl border border-slate-900 bg-slate-900/30 p-5 backdrop-blur-md transition-all hover:border-slate-800/80">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/user/${cleanUsername}`}
            className="shrink-0"
          >
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-900 bg-slate-900">
              {hasAvatar ? (
                <Image
                  src={
                    post.profiles
                      ?.avatar_url as string
                  }
                  alt={
                    post.profiles
                      ?.username ??
                    'Profile'
                  }
                  fill
                  sizes="40px"
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-black text-slate-200">
                  {initials}
                </span>
              )}
            </div>
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/user/${cleanUsername}`}
                className="text-sm font-bold text-slate-100 hover:text-white hover:underline"
              >
                @
                {post.profiles
                  ?.username ??
                  'anonymous'}
              </Link>

              {post.profiles
                ?.is_verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 fill-yellow-600 stroke-slate-950 text-slate-950" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Active Trader
              </span>

              <span className="text-xs font-mono font-bold text-emerald-400">
                +
                {post.profiles
                  ?.monthly_roi ?? 0}
                %
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-[11px] font-semibold cursor-pointer text-slate-300 transition-colors hover:border-yellow-600/30 hover:text-yellow-600"
        >
          Follow
        </button>
      </div>

      <div className="mt-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {post.content}
        </p>
      </div>

      {assetMeta && (
        <div className="mt-5 rounded-2xl border border-slate-900 bg-slate-950/40 p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    assetMeta.type ===
                    'gold'
                      ? 'bg-yellow-600'
                      : 'bg-emerald-400'
                  }`}
                />

                <span className="text-sm font-bold text-white">
                  {assetMeta.symbol}
                </span>

                <span className="text-xs text-slate-500">
                  {assetMeta.name}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`text-lg font-black ${
                    assetMeta.type ===
                    'gold'
                      ? 'text-yellow-600'
                      : 'text-white'
                  }`}
                >
                  {assetPrice}
                </span>

                <span
                  className={`text-sm font-bold ${
                    assetPositive
                      ? 'text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  {assetChange}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                assetMeta.type ===
                'gold'
                  ? 'bg-yellow-600 text-slate-950 hover:bg-yellow-500'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
              }`}
            >
              {assetMeta.type ===
              'gold'
                ? 'Accumulate'
                : 'Copy Setup'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-900/60 pt-3">
        <button
          type="button"
          onClick={handleLikeClick}
          disabled={
            toggleLikeMutation.isPending
          }
          className={`flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-xl py-2 text-xs font-semibold transition-all ${
            post.isLikedByCurrentUser
              ? 'bg-yellow-600/5 text-yellow-600'
              : 'text-slate-500 hover:bg-slate-900/40 hover:text-slate-300'
          }`}
        >
          <ThumbsUp
            className={`h-4 w-4 ${
              post.isLikedByCurrentUser
                ? 'fill-yellow-600'
                : ''
            }`}
          />
          <span>
            Like (
            {post.likes_count})
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setCommentOpen(true)
          }
          className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-xl py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/40 hover:text-slate-300"
        >
          <MessagesSquare className="h-4 w-4" />
          <span>
            Comment (
            {post.comments_count})
          </span>
        </button>

        <button
          type="button"
          className="flex flex-1 items-center justify-center cursor-pointer gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/40 hover:text-slate-300"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>

      {/* <CommentDrawer
        postId={post.id}
        isOpen={commentOpen}
        onClose={() =>
          setCommentOpen(false)
        }
      /> */}
    </article>
  )
}