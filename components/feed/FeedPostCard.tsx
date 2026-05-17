// components/feed/FeedPostCard.tsx
'use client'

import Image from 'next/image'
import PostInteractions from './PostInteractions'
import { BadgeCheck } from 'lucide-react'

export interface FeedPost {
  id: string
  author: {
    name: string
    username: string
    avatar: string
    verified?: boolean
    roi?: string
  }
  content: string
  asset: {
    symbol: string
    name: string
    price: string
    change: string
    positive: boolean
    type: 'crypto' | 'gold'
  }
  likes: number
  comments: number
  shares: number
}

interface FeedPostCardProps {
  post: FeedPost
}

export default function FeedPostCard({
  post
}: FeedPostCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800/40 bg-slate-900/40 p-5 backdrop-blur-md">
      
      {/* AUTHOR */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={post.author.avatar}
            alt={post.author.username}
            width={40}
            height={40}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-800"
          />

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">
                {post.author.username}
              </span>

              {post.author.verified && (
                <BadgeCheck className="h-4 w-4 fill-yellow-600 text-slate-950" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Active Trader
              </span>

              {post.author.roi && (
                <span className="text-xs font-semibold text-emerald-400">
                  {post.author.roi}
                </span>
              )}
            </div>
          </div>
        </div>

        <button className="rounded-full border border-slate-800 cursor-pointer bg-slate-900/40 px-3 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-yellow-600/30 hover:text-yellow-600">
          Follow
        </button>
      </div>

      {/* CONTENT */}
      <div className="mt-4">
        <p className="text-sm leading-relaxed text-slate-300">
          {post.content}
        </p>
      </div>

      {/* TRADE TAG */}
      <div className="mt-5 rounded-2xl border border-slate-800/40 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  post.asset.type === 'gold'
                    ? 'bg-yellow-600'
                    : 'bg-emerald-400'
                }`}
              />

              <span className="text-sm font-bold text-white">
                {post.asset.symbol}
              </span>

              <span className="text-xs text-slate-500">
                {post.asset.name}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <span
                className={`text-lg font-black ${
                  post.asset.type === 'gold'
                    ? 'text-yellow-600'
                    : 'text-white'
                }`}
              >
                {post.asset.price}
              </span>

              <span
                className={`text-sm font-bold ${
                  post.asset.positive
                    ? 'text-emerald-400'
                    : 'text-rose-500'
                }`}
              >
                {post.asset.change}
              </span>
            </div>
          </div>

          <button
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              post.asset.type === 'gold'
                ? 'bg-yellow-600 text-slate-950 hover:bg-yellow-500'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
            }`}
          >
            {post.asset.type === 'gold'
              ? 'Accumulate'
              : 'Copy Setup'}
          </button>
        </div>
      </div>

      {/* INTERACTIONS */}
      <div className="mt-4">
        <PostInteractions
          initialLikes={post.likes}
          initialComments={post.comments}
          initialShares={post.shares}
        />
      </div>
    </article>
  )
}