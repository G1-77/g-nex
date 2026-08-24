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
  
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGetInfiniteFeedQuery(user?.id ?? null)

  useFeedRealtime()

  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '250px',
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const flatPosts = data?.pages.flatMap((page) => page.posts) ?? []

  if (isLoading) {
    return (
      <section className="space-y-6 w-full">
        <CreatePostCard />
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-surface p-10 text-center text-caption font-bold uppercase tracking-widest text-text-muted">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 text-brand animate-spin" />
            <span>Loading your feed...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6 w-full flex flex-col">
      <CreatePostCard />
      {flatPosts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
      {flatPosts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 py-16 text-center select-none animate-fadeIn">
          <p className="text-caption font-black text-text-muted uppercase tracking-wider">Timeline Empty</p>
          <p className="mt-1 text-body-sm text-text-muted">No posts yet. Be the first to share market intelligence.</p>
        </div>
      )}
      {hasNextPage && (
        <div ref={ref} className="w-full flex justify-center py-6 select-none">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-text-muted text-caption font-medium bg-surface/40 border border-border rounded-xl px-4 py-2 backdrop-blur-md animate-fadeIn shadow-sm">
              <Loader2 className="h-3.5 w-3.5 text-brand animate-spin" />
              <span className="tracking-wide">Fetching Next Market Setups...</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
