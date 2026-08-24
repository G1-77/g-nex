'use client'

// components/home/TopTradersToFollow.tsx
// "Traders You May Know" — compact feed-style discovery module directly after
// the wallet snapshot. Horizontal scroll, touch-friendly, deterministic
// ranking from the authoritative monthly_roi pipeline (30d realized P&L /
// confirmed deposits). Follow state comes from the existing follows table —
// never a Home-local follow system.

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'
import { useToggleFollowMutation } from '@/lib/react-query/mutations/follow.mutations'
import { useFollowingIdsQuery } from '@/lib/react-query/queries/followers.queries'
import { useTopTraders } from '@/lib/react-query/queries/traders.queries'

function TraderCardSkeleton() {
  return (
    <div className="gnex-card w-[200px] shrink-0 animate-pulse p-4" aria-hidden="true">
      <div className="flex items-center gap-2.5">
        <div className="h-11 w-11 rounded-full bg-surface-hover" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-20 rounded bg-surface-hover" />
          <div className="h-2.5 w-14 rounded bg-surface-hover" />
        </div>
      </div>
      <div className="mt-3 h-5 w-16 rounded bg-surface-hover" />
      <div className="mt-4 h-9 w-full rounded-lg bg-surface-hover" />
    </div>
  )
}

interface TopTraderCardProps {
  trader: {
    id: string
    username: string
    avatar_url: string | null
    is_verified: boolean
    monthly_roi: number
    realized_kes: number | null
  }
  isFollowing: boolean
}

function TopTraderCard({ trader, isFollowing }: TopTraderCardProps) {
  const { profile } = useAuth()
  const toggleFollow = useToggleFollowMutation()
  const isSelf = profile?.id === trader.id

  const roiPct = `${trader.monthly_roi >= 0 ? '+' : ''}${(trader.monthly_roi * 100).toFixed(1)}%`
  const positive = trader.monthly_roi >= 0

  const handleFollow = () => {
    if (!profile || isSelf) return
    toggleFollow.mutate(
      { followerId: profile.id, followingId: trader.id },
      {
        onError: (error: Error) => {
          console.error('GNEX follow toggle failed:', error.message)
        },
      }
    )
  }

  return (
    <Link
      href={`/user/${trader.username}`}
      className="gnex-card gnex-card-hover group flex w-[190px] shrink-0 cursor-pointer snap-start flex-col gap-3 p-4"
      aria-label={`View ${trader.username}'s profile`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border">
          {trader.avatar_url ? (
            <Image src={trader.avatar_url} alt="" fill sizes="44px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-elevated text-caption font-black text-text-secondary">
              {trader.username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-body-sm font-bold text-text-primary">
            <span className="truncate">{trader.username}</span>
            {trader.is_verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand" />}
          </p>
          <p className="truncate font-mono text-caption text-text-muted">@{trader.username}</p>
        </div>
      </div>

      {/* Performance signal — authoritative 30D ROI only; nothing invented */}
      <div>
        <p className={`font-mono text-mono-sm font-bold ${positive ? 'text-success' : 'text-danger'}`}>
          {roiPct}
        </p>
        <p className="text-caption text-text-muted">30D performance</p>
        {trader.realized_kes !== null && (
          <p className="mt-0.5 truncate font-mono text-[10px] text-text-muted">
            KES {Math.round(trader.realized_kes).toLocaleString('en-KE')} · 30D P&amp;L
          </p>
        )}
      </div>

      {!isSelf && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFollow()
          }}
          disabled={toggleFollow.isPending}
          aria-pressed={isFollowing}
          className={`flex min-h-[36px] w-full cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-caption font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
            isFollowing
              ? 'border border-border bg-surface text-text-secondary hover:bg-surface-hover'
              : 'bg-brand text-text-inverse shadow-sm shadow-brand/20 hover:bg-brand/90'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </Link>
  )
}

export default function TopTradersToFollow() {
  const { user } = useAuth()
  const { data: topTraders, isLoading, isError } = useTopTraders(10)
  const { data: followingIds } = useFollowingIdsQuery(user?.id ?? null)

  const followingSet = useMemo(() => new Set(followingIds ?? []), [followingIds])

  // Exclude self + already-followed traders so the rail always suggests new connections.
  const suggestions = useMemo(() => {
    if (!topTraders) return []
    return topTraders.filter((t) => t.id !== user?.id && !followingSet.has(t.id)).slice(0, 8)
  }, [topTraders, user?.id, followingSet])

  // Loading → reserved-height skeleton row (no layout jump)
  if (isLoading) {
    return (
      <section aria-label="Traders you may know" className="space-y-2">
        <h2 className="text-body-sm font-bold text-text-primary">Traders You May Know</h2>
        <div className="flex snap-x gap-3 overflow-x-auto pb-1 no-scrollbar">
          {[...Array(3)].map((_, i) => (
            <TraderCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  // Empty / error → degrade gracefully; the section simply does not render.
  if (isError || suggestions.length === 0) return null

  return (
    <section aria-label="Traders you may know" className="space-y-2">
      {/* Compact discovery-module header — deliberately NOT a promo banner */}
      <h2 className="text-body-sm font-bold text-text-primary">Traders You May Know</h2>

      <div className="-mx-page flex snap-x snap-mandatory gap-3 overflow-x-auto px-page pb-1 no-scrollbar">
        {suggestions.map((trader) => (
          <TopTraderCard
            key={trader.id}
            trader={trader}
            isFollowing={followingSet.has(trader.id)}
          />
        ))}
      </div>
    </section>
  )
}
