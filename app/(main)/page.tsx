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

      <div className="mx-auto max-w-5xl px-page py-8">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
          {/* CENTER — primary workspace (navigation lives in the shell sidebar) */}
          <main className="col-span-1 grid gap-6 md:col-span-2">
            <FeedList />
          </main>

          {/* RIGHT SIDEBAR — contextual intelligence */}
          <aside className="col-span-1 hidden flex-col gap-6 sticky top-24 h-fit md:flex">
            <TopTradersWidget />

            <TopMoversWidget />

            <MarketsWatchWidget />

            <TopStories />
          </aside>
        </div>
      </div>
    </div>
  )
}
