import FeedList from '@/components/feed/FeedList'
import TickerStrip from '@/components/feed/TickerStrip'
import MarketsWatchWidget from '@/components/feed/MarketsWatchWidget'
import TopMoversWidget from '@/components/feed/TopMoversWidget'
import TopStories from '@/components/market/TopStories'
import TopTradersWidget from '@/components/feed/TopTradersWidget'

import HomeComposer from '@/components/home/HomeComposer'
import TraderDiscoverySection from '@/components/home/TraderDiscoverySection'
import TradingActivityFeed from '@/components/home/TradingActivityFeed'
import MarketOpportunities from '@/components/home/MarketOpportunities'
import SentimentOverview from '@/components/home/SentimentOverview'
import PortfolioAccessCard from '@/components/home/PortfolioAccessCard'
import FeedTransition from '@/components/home/FeedTransition'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background text-foreground antialiased selection:bg-brand/20 md:pb-0">
            <TickerStrip />

            <div className="mx-auto max-w-5xl px-page py-8">
                <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
                    {/* CENTER — primary workspace (navigation lives in the shell sidebar) */}
                    <main className="col-span-1 grid gap-6 md:col-span-2">
                        {/* 1. Create Post — first interaction (brief §11) */}
                        <HomeComposer />

                        {/* 2. Trader Discovery (brief §13) */}
                        <TraderDiscoverySection />

                        {/* 3. Trading Activity (brief §14) */}
                        <TradingActivityFeed />

                        {/* 4. Market Opportunities (brief §15) */}
                        <MarketOpportunities />

                        {/* 5. Market Sentiment (brief §16) */}
                        <SentimentOverview />

                        {/* 6. Quick Trade / FTT — Phase E will add chart preview; for now embed panel */}
                        <div className="gnex-card p-3">
                            <p className="text-sm font-medium text-text-primary mb-2">Quick Trade / FTT</p>
                            <p className="text-body-sm text-text-muted">Chart preview + compact execution coming in next phase.</p>
                        </div>

                        {/* 7. Low-priority Portfolio Access (brief §11, §43) */}
                        <PortfolioAccessCard />

                        {/* 8. Feed Transition (brief §26, §49, §50) */}
                        <FeedTransition />
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