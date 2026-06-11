'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Loader2 } from 'lucide-react'

import { useGetInfiniteFeedQuery } from '@/lib/react-query/queries/feed.queries'
import { useFeedRealtime } from '@/lib/hooks/useFeedRealtime'
import { useAuth } from '../providers/AuthProvider'

import CreatePostCard from './CreatePostCard'
import FeedPostCard from './FeedPostCard'

export default function FeedList() {
  const { user } = useAuth()
  
  // 1. DYNAMIC INFINITE QUERY STREAM HOOK
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGetInfiniteFeedQuery(user?.id ?? null)

  // 2. BACKEND SUPABASE REAL-TIME REPLICATION HANDLER
  useFeedRealtime()

  // 3. INITIALIZE VIEWPORT OVERLAY BASE INTERSECTION OBSERVER REF
  const { ref, inView } = useInView({
    threshold: 0.1,    // Trigger fetch logic when 10% of element hits screen boundary
    rootMargin: '250px', // Pre-fetch data chunks 250px early to keep infinite feel smooth
  })

  // 4. EFFECT LIFECYCLE: Auto-fetch fresh pages when scroll approaches base
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // UNROLL CHUNK BLOCKS INTO A SINGLE PURE TYPE-SAFE FLAT ARRAY STREAM
  const flatPosts = data?.pages.flatMap((page) => page.posts) ?? []

  // SKELETAL PROGRESS LOADING SKINS WITH EMBEDDED COMPOSITION CARDS PRESERVED
  if (isLoading) {
    return (
      <section className="space-y-6 w-full">
        {/* 🟢 FIXED: Kept composer layout completely visible during initial load states */}
        <CreatePostCard />

        <div className="animate-pulse rounded-2xl border border-slate-900 bg-slate-950 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-500 backdrop-blur-xl shadow-xl shadow-black/10">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
            <span>Loading your feed...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6 w-full flex flex-col">

      <CreatePostCard />

      {/* CHRONOLOGICAL POST CARD CAROUSEL MAP MATRIX */}
      {flatPosts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}

      {/* EMPTY FEED OVERLAY STATES CAP FRAME */}
      {flatPosts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-900 bg-slate-900/10 py-16 text-center select-none animate-fadeIn">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Timeline Empty
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            No posts yet. Be the first to share market intelligence.
          </p>
        </div>
      )}

      {hasNextPage && (
        <div ref={ref} className="w-full flex justify-center py-6 select-none">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium bg-slate-950/40 border border-slate-900/60 rounded-xl px-4 py-2 backdrop-blur-md animate-fadeIn shadow-sm">
              <Loader2 className="h-3.5 w-3.5 text-yellow-600 animate-spin" />
              <span className="tracking-wide">Fetching Next Market Setups...</span>
            </div>
          )}
        </div>
      )}

    </section>
  )
}
