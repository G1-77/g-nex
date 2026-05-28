'use client'

import { useFeedRealtime } from '@/lib/hooks/useFeedRealtime'
import { useGetFeedQuery } from '@/lib/react-query/queries/feed.queries'

import CreatePostCard from './CreatePostCard'
import FeedPostCard from './FeedPostCard'

export default function FeedList() {
  const { data, isLoading } =
    useGetFeedQuery()

  useFeedRealtime()

  if (isLoading) {
    return (
      <section className="space-y-6">
        <CreatePostCard />

        <div className="animate-pulse rounded-2xl border border-slate-800/40 bg-slate-900/30 p-10 text-center text-sm text-slate-500">
          Loading your feed...
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <CreatePostCard />

      {data?.map((post) => {
        /*
         * Prevent undefined crashes
         * on empty asset arrays
         */
        const primaryAsset =
          post.assetSymbols?.[0] ??
          'BTC'

        return (
          <FeedPostCard
            key={post.id}
            post={{
              id: post.id,

              author: {
                /*
                 * Fully defensive
                 * fallback chain
                 */
                name:
                  post.profiles
                    ?.full_name ??
                  post.profiles
                    ?.username ??
                  'Anonymous Trader',

                username:
                  post.profiles
                    ?.username
                    ? `@${post.profiles.username}`
                    : '@anonymous',

                avatar:
                  post.profiles
                    ?.avatar_url ??
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',

                verified:
                  post.profiles
                    ?.is_verified ??
                  false,

                roi:
                  post.profiles
                    ?.monthly_roi
                    ? `+${post.profiles.monthly_roi}% Monthly ROI`
                    : '+12% ROI',
              },

              content:
                post.content,

              asset: {
                symbol:
                  primaryAsset,

                name:
                  primaryAsset ===
                  'XAU'
                    ? 'Spot Gold'
                    : primaryAsset ===
                        'SOL'
                      ? 'Solana'
                      : 'Bitcoin',

                price:
                  primaryAsset ===
                  'XAU'
                    ? '$2,345.50/oz'
                    : primaryAsset ===
                        'SOL'
                      ? '$142.20'
                      : '$64,250.00',

                change:
                  primaryAsset ===
                  'XAU'
                    ? '-0.3%'
                    : primaryAsset ===
                        'SOL'
                      ? '+5.1%'
                      : '+3.4%',

                positive:
                  primaryAsset !==
                  'XAU',

                type:
                  primaryAsset ===
                  'XAU'
                    ? 'gold'
                    : 'crypto',
              },

              likes: 0,

              comments: 0,

              shares: 0,
            }}
          />
        )
      })}
    </section>
  )
}