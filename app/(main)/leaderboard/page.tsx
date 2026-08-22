import Image from 'next/image'
import { BadgeCheck, Trophy } from 'lucide-react'

import TopStories from '@/components/market/TopStories'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const LEADERBOARD_SIZE = 20

interface LeaderboardRow {
  id: string
  username: string
  avatar_url: string | null
  is_verified: boolean
  monthly_roi: number
  realized_kes: number | null
}

function initialsOf(username: string): string {
  return username.replace(/^@/, '').slice(0, 2).toUpperCase()
}

async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_verified, monthly_roi, roi_realized_kes')
    .gt('monthly_roi', 0)
    .order('monthly_roi', { ascending: false })
    .order('roi_realized_kes', { ascending: false, nullsFirst: false })
    .limit(LEADERBOARD_SIZE)

  // An RLS/Network failure should not kill the whole page — render empty.
  if (error) {
    console.error('leaderboard query failed:', error.message)
    return []
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    username: t.username,
    avatar_url: t.avatar_url,
    is_verified: Boolean(t.is_verified),
    monthly_roi: Number(t.monthly_roi ?? 0),
    realized_kes: t.roi_realized_kes === null ? null : Number(t.roi_realized_kes),
  }))
}

function RankMedal({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500'
      : rank === 2
        ? 'border-slate-400/30 bg-slate-400/10 text-slate-300'
        : rank === 3
          ? 'border-amber-600/40 bg-amber-600/10 text-amber-600'
          : 'border-slate-800 bg-slate-900 text-slate-500'

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-black ${style}`}
    >
      {rank}
    </span>
  )
}

export default async function LeaderboardPage() {
  const rows = await fetchLeaderboard()

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100 antialiased md:pb-0">
      <div className="mx-auto max-w-3xl px-4 py-6">

        {/* HEADER */}
        <header className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-600/20 bg-yellow-600/10">
            <Trophy className="h-5 w-5 text-yellow-600" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-100">Leaderboards</h1>
            <p className="text-xs text-slate-500">
              Top traders ranked by daily-computed 30d ROI
            </p>
          </div>
        </header>

        {/* RANKINGS */}
        <section className="mt-6">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-8 text-center">
              <p className="font-mono text-xs text-slate-500">
                No ranked traders yet — ROI updates daily as trades settle.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-900/60 overflow-hidden rounded-2xl border border-slate-900/60 bg-slate-900/20">
              {rows.map((trader, i) => {
                const rank = i + 1
                return (
                  <li key={trader.id}>
                    <a
                      href={`/user/${trader.username}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-900/40"
                    >
                      <RankMedal rank={rank} />

                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-800">
                        {trader.avatar_url ? (
                          <Image
                            src={trader.avatar_url}
                            alt={`@${trader.username}`}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-slate-900 text-[11px] font-black text-slate-300">
                            {initialsOf(trader.username)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-slate-100 transition-colors group-hover:text-slate-100">
                            @{trader.username}
                          </span>
                          {trader.is_verified && (
                            <BadgeCheck className="h-4 w-4 shrink-0 fill-yellow-600 stroke-slate-950" />
                          )}
                        </div>
                        {typeof trader.realized_kes === 'number' && (
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                            {trader.realized_kes >= 0 ? '+' : ''}
                            {trader.realized_kes.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                            KES realized · 30d
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-sm font-black ${
                          trader.monthly_roi < 0
                            ? 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                            : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                        }`}
                      >
                        {trader.monthly_roi > 0 ? '+' : ''}
                        {trader.monthly_roi.toFixed(2)}%
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* TOP STORIES */}
        <section className="mt-8">
          <TopStories />
        </section>
      </div>
    </div>
  )
}
