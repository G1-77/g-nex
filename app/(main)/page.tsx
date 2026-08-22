import {
  Bookmark,
  GraduationCap,
  LineChart,
} from 'lucide-react'
import Link from 'next/link'
import FeedList from '@/components/feed/FeedList'
import TickerStrip from '@/components/feed/TickerStrip'
import MarketsWatchWidget from '@/components/feed/MarketsWatchWidget'
import TopMoversWidget from '@/components/feed/TopMoversWidget'
import TopStories from '@/components/market/TopStories'
import TopTradersWidget from '@/components/feed/TopTradersWidget'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-brand/20 md:pb-0">
      <TickerStrip />

      <div className="mx-auto max-w-6xl px-page py-8">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-4">
          
          {/* LEFT SIDEBAR */}
          <aside className="sticky top-24 hidden flex-col gap-6 md:flex">
            
            {/* QUICK ACCESS */}
            <div className="space-y-1">
              <p className="mb-2 px-3 text-caption font-bold uppercase tracking-wider text-muted">
                Explore
              </p>

              {[
                {
                  icon: Bookmark,
                  label: 'Saved Strategies',
                  href: null
                },
                {
                  icon: LineChart,
                  label: 'Leaderboards',
                  href: '/leaderboard'
                },
                {
                  icon: GraduationCap,
                  label: 'GNEX Academy',
                  href: null
                }
              ].map((item) => {
                const Icon = item.icon

                const inner = (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface transition-colors group-hover:bg-surface-hover">
                      <Icon className="h-4 w-4 text-text-secondary transition-colors group-hover:text-brand" />
                    </div>

                    {item.label}
                  </>
                )

                const className =
                  'group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-hover hover:text-text-primary'

                return item.href ? (
                  <Link key={item.label} href={item.href} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <button key={item.label} className={className}>
                    {inner}
                  </button>
                )
              })}
            </div>

            {/* WATCHLIST */}
            <MarketsWatchWidget />
          </aside>

          {/* CENTER FEED */}
          <main className="col-span-1 grid gap-6 md:col-span-2 lg:col-span-2">
            
            <FeedList />
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="col-span-1 hidden flex-col gap-6 md:flex sticky top-24 h-fit">
            
            {/* TOP TRADERS */}
            <TopTradersWidget />

            {/* TOP MOVERS */}
            <TopMoversWidget />

            {/* TOP STORIES */}
            <TopStories />
          </aside>
        </div>
      </div>
    </div>
  )
}