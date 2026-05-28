'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, ThumbsUp, MessageSquare, Share2 } from 'lucide-react'

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
  // 🟢 FIXED: Made asset explicitly optional/nullable to support free text posting
  asset?: {
    symbol: string
    name: string
    price: string
    change: string
    positive: boolean
    type: 'crypto' | 'gold'
  } | null
  likes: number
  comments: number
  shares: number
}

interface FeedPostCardProps {
  post: FeedPost
}

export default function FeedPostCard({ post }: FeedPostCardProps) {
  // Safe extraction matching our dynamic dynamic user page route destinations
  const cleanUsername = post.author.username.replace('@', '')

  return (
    <article className="rounded-2xl border border-slate-900 bg-slate-900/30 p-5 backdrop-blur-md transition-all hover:border-slate-800/80">
      
      {/* AUTHOR ROW HEADER */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/user/${cleanUsername}`} className="cursor-pointer shrink-0 transition-transform active:scale-95">
            <Image
              src={post.author.avatar}
              alt={post.author.username}
              width={40}
              height={40}
              style={{ width: "40px", height: "40px" }}
              className="rounded-full object-cover ring-1 ring-slate-800"
            />
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link 
                href={`/user/${cleanUsername}`}
                className="text-sm font-bold text-slate-100 hover:text-white hover:underline cursor-pointer"
              >
                {post.author.username}
              </Link>

              {post.author.verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-slate-950 fill-yellow-600 stroke-slate-950" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Active Trader</span>
              {post.author.roi && (
                <span className="text-xs font-mono font-bold text-emerald-400">
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

      {/* TEXT METADATA CONTENT */}
      <div className="mt-4">
        <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* OPTIONAL TRADE TAG PANEL WIDGET (Only draws if an asset object is passed) */}
      {post.asset && (
        <div className="mt-5 rounded-2xl border border-slate-900 bg-slate-950/40 p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    post.asset.type === 'gold' ? 'bg-yellow-600' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-sm font-bold text-white">{post.asset.symbol}</span>
                <span className="text-xs text-slate-500">{post.asset.name}</span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className={`text-lg font-black ${post.asset.type === 'gold' ? 'text-yellow-600' : 'text-white'}`}>
                  {post.asset.price}
                </span>
                <span className={`text-sm font-bold ${post.asset.positive ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {post.asset.change}
                </span>
              </div>
            </div>

            <button
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                post.asset.type === 'gold'
                  ? 'bg-yellow-600 text-slate-950 hover:bg-yellow-500 shadow-md shadow-yellow-600/5'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
              }`}
            >
              {post.asset.type === 'gold' ? 'Accumulate' : 'Copy Setup'}
            </button>
          </div>
        </div>
      )}

      {/* STABLE INLINED FACEBOOK-STYLE INTERACTIONS STRIP BAR */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-900/60 pt-3 bg-transparent">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 transition-all cursor-pointer group">
          <ThumbsUp className="h-4 w-4 group-hover:scale-105 transition-transform" />
          <span>Like ({post.likes})</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 transition-all cursor-pointer group">
          <MessageSquare className="h-4 w-4 group-hover:scale-105 transition-transform" />
          <span>Comment ({post.comments})</span>
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 transition-all cursor-pointer group">
          <Share2 className="h-4 w-4 group-hover:scale-105 transition-transform" />
          <span>Share</span>
        </button>
      </div>

    </article>
  )
}
