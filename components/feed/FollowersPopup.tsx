'use client'

import { useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, BadgeCheck, Loader2, Users } from 'lucide-react'

import { useGetFollowersQuery } from '@/lib/react-query/queries/followers.queries'
import type { Profile } from '@/lib/supabase/types'

interface FollowersPopupProps {
  userId: string
  count: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function FollowerRow({ follower }: { follower: Profile }) {
  const cleanUsername = follower.username?.replace('@', '') || 'anonymous'
  const hasAvatar = Boolean(follower.avatar_url?.trim())

  const initials = useMemo(() => {
    const fullName = follower.full_name?.trim()

    if (fullName) {
      const parts = fullName.split(' ').filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
      }
      return parts[0]?.slice(0, 2).toUpperCase() ?? 'GN'
    }

    const username = follower.username?.trim()
    if (username) {
      return username.replace('@', '').slice(0, 2).toUpperCase()
    }

    return 'GN'
  }, [follower.full_name, follower.username])

  return (
    <Link
      href={`/user/${cleanUsername}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-900/60"
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-900 bg-slate-900">
        {hasAvatar ? (
          <Image
            src={follower.avatar_url as string}
            alt={follower.username ?? 'Follower'}
            fill
            sizes="36px"
            className="rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] font-black font-mono text-slate-400">
            {initials}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 truncate text-xs font-bold text-slate-200">
          {follower.full_name || follower.username || 'Anonymous User'}
          {follower.is_verified && (
            <BadgeCheck className="h-3 w-3 shrink-0 fill-yellow-600 stroke-slate-950 text-slate-950" />
          )}
        </span>
        <span className="truncate font-mono text-[10px] text-slate-500">
          @{follower.username || 'anonymous'}
        </span>
      </div>
    </Link>
  )
}

export default function FollowersPopup({
  userId,
  count,
  isOpen,
  onOpenChange,
}: FollowersPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const { data: followers, isLoading } = useGetFollowersQuery(userId)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onOpenChange])

  if (!isOpen) return null

  return (
    <div
      ref={popupRef}
      className="absolute left-0 top-7 z-50 w-72 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black backdrop-blur-xl animate-fadeIn"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-yellow-600" />
          <span className="text-xs font-black tracking-wide text-slate-200">
            Followers
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
            {count}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-900 bg-slate-900/50 text-slate-400 transition-colors hover:border-slate-800 hover:text-slate-50"
          aria-label="Close followers"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* BODY */}
      <div className="max-h-72 overflow-y-auto no-scrollbar p-2">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-600" />
            <span className="text-[11px] font-bold text-slate-500">
              Loading followers...
            </span>
          </div>
        )}

        {!isLoading && (!followers || followers.length === 0) && (
          <div className="py-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              No followers yet
            </p>
            <p className="mt-1 text-[10px] text-slate-600">
              This trader is still building their audience.
            </p>
          </div>
        )}

        {!isLoading &&
          followers &&
          followers.map((follower) => (
            <FollowerRow key={follower.id} follower={follower} />
          ))}
      </div>
    </div>
  )
}