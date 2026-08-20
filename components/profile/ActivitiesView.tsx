'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Loader2, TrendingUp, TrendingDown, Briefcase } from 'lucide-react'

import FeedPostCard from '@/components/feed/FeedPostCard'
import { useGetUserPostsQuery } from '@/lib/react-query/queries/feed.queries'
import { useGetUserPositionsQuery, type UserPosition } from '@/lib/react-query/queries/positions.queries'
import { useAuth } from '@/components/providers/AuthProvider'

interface ActivitiesViewProps {
  userId: string
  username: string
}

const ASSET_META: Record<string, { symbol: string; name: string }> = {
  BTC: { symbol: 'BTC', name: 'Bitcoin' },
  ETH: { symbol: 'ETH', name: 'Ethereum' },
  SOL: { symbol: 'SOL', name: 'Solana' },
  XRP: { symbol: 'XRP', name: 'Ripple' },
  USDT: { symbol: 'USDT', name: 'Tether' },
  XAU: { symbol: 'XAU', name: 'Spot Gold' },
}

function PositionRow({ position }: { position: UserPosition }) {
  const meta = ASSET_META[position.asset_symbol] ?? {
    symbol: position.asset_symbol,
    name: position.asset_symbol,
  }
  const long = position.direction !== 'Short'
  const logo = `/icons/${position.asset_symbol.toLowerCase()}.svg`

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-900/60 bg-slate-900/20 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-900 bg-slate-900">
        <Image
          src={logo}
          alt={meta.name}
          width={22}
          height={22}
          className="h-5.5 w-5.5"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-100">{meta.symbol}</span>
          <span className="truncate text-xs text-slate-500">{meta.name}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              long
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
            }`}
          >
            {long ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {long ? 'Long' : 'Short'}
          </span>
        </div>

        <span className="mt-0.5 font-mono text-[10px] text-slate-500">
          {position.units} units · KES {Number(position.margin_kes ?? 0).toLocaleString()} margin
        </span>
      </div>

      <Link
        href={`/markets/${position.asset_symbol.toLowerCase()}`}
        className="shrink-0 rounded-lg border border-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition-colors hover:border-yellow-600/40 hover:text-yellow-600"
      >
        Market
      </Link>
    </li>
  )
}

export default function ActivitiesView({ userId, username }: ActivitiesViewProps) {
  const { user } = useAuth()
  const { data: posts, isLoading: postsLoading } = useGetUserPostsQuery(
    userId,
    user?.id ?? null
  )
  const { data: positions, isLoading: positionsLoading } = useGetUserPositionsQuery(userId)

  return (
    <div className="space-y-8">
      {/* POSITIONS */}
      <section>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-yellow-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            Open Positions
          </h2>
        </div>

        <div className="mt-3">
          {positionsLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-950 py-8 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
              <span>Loading positions...</span>
            </div>
          ) : !positions || positions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-900 bg-slate-900/10 py-10 text-center">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                No open positions
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                @{username} has no active trades right now.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {positions.map((position) => (
                <PositionRow key={position.id} position={position} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* POSTS / TRADE TAGS */}
      <section>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-yellow-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            Trade Setups
          </h2>
        </div>

        <div className="mt-3">
          {postsLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-950 py-8 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
              <span>Loading setups...</span>
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-900 bg-slate-900/10 py-10 text-center">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                No trade setups yet
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                @{username} hasn&apos;t shared market intelligence yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}