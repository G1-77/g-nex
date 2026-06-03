'use client'

import { useAuth } from '../providers/AuthProvider'

import { useFeedRealtime } from '@/lib/hooks/useFeedRealtime'
import { useGetFeedQuery } from '@/lib/react-query/queries/feed.queries'

import type { FeedPost  } from '@/lib/supabase/types'

import CreatePostCard from './CreatePostCard'
import FeedPostCard from './FeedPostCard'

export default function FeedList() {
  const { user } = useAuth()

  const { data, isLoading } =
    useGetFeedQuery() as {
      data: FeedPost[] | undefined
      isLoading: boolean
    }

  useFeedRealtime()

  if (isLoading) {
    return (
      <section className="space-y-6">
        <CreatePostCard />

        <div className="animate-pulse rounded-2xl border border-slate-900/80 bg-slate-950/95 p-10 text-center text-sm text-slate-500 backdrop-blur-xl">
          Loading your feed...
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <CreatePostCard />

      {data?.map((post: FeedPost) => (
        <FeedPostCard
          key={post.id}
          post={post}
        />
      ))}

      {!isLoading &&
        (!data || data.length === 0) && (
          <div className="rounded-2xl border border-slate-900/80 bg-slate-950/95 p-10 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">
              No posts available yet.
            </p>

            {user && (
              <p className="mt-2 text-xs text-slate-600">
                Be the first to share market
                intelligence.
              </p>
            )}
          </div>
        )}
    </section>
  )
}