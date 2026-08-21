'use client'

import { Loader2 } from 'lucide-react'

import { useGetUserPostsQuery } from '@/lib/react-query/queries/feed.queries'
import { useAuth } from '@/components/providers/AuthProvider'
import FeedPostCard from '@/components/feed/FeedPostCard'

export default function ProfilePosts({ userId }: { userId: string }) {
  const { user } = useAuth()
  const { data: posts, isLoading } = useGetUserPostsQuery(userId, user?.id ?? null)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-900 bg-slate-950 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-500 backdrop-blur-xl">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
          <span>Loading posts...</span>
        </div>
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-900 bg-slate-900/10 py-16 text-center">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          No posts yet
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          This trader hasn&apos;t shared market intelligence yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} variant="profile" />
      ))}
    </div>
  )
}