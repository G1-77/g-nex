'use client'

// app/(main)/page.tsx — GNEX HOME
// Trading-first social exchange homepage (mobile-first IA):
//   Search → Wallet snapshot → Top Traders to Follow → Promotion carousel →
//   Quick actions (Deposit / Favourite asset) → Market snapshot → Discover.
// Every data surface reuses the existing authoritative pipelines; nothing on
// this page computes its own financial values.

import TickerStrip from '@/components/feed/TickerStrip'
import MarketsWatchWidget from '@/components/feed/MarketsWatchWidget'
import TopMoversWidget from '@/components/feed/TopMoversWidget'
import TopStories from '@/components/market/TopStories'
import TopTradersWidget from '@/components/feed/TopTradersWidget'

import Search from '@/components/layout/Search'
import HomeWalletSnapshot from '@/components/home/HomeWalletSnapshot'
import TopTradersToFollow from '@/components/home/TopTradersToFollow'
import PromotionCarousel from '@/components/home/PromotionCarousel'
import QuickActionCards from '@/components/home/QuickActionCards'
import HomeMarketSnapshot from '@/components/home/HomeMarketSnapshot'
import DiscoverTransition from '@/components/home/DiscoverTransition'

import { useActivePromotions } from '@/lib/react-query/promotions.queries'

function PromotionSection() {
  const { data: promotions = [], isError } = useActivePromotions()

  // Promotions are non-critical: query failure renders nothing and never
  // blocks wallet, markets or social content.
  if (isError) return null

  return <PromotionCarousel promotions={promotions} />
}

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background text-foreground antialiased selection:bg-brand/20 md:pb-0">
            {/* Live ticker — market awareness above the fold, desktop + mobile */}
            <TickerStrip />

            <div className="mx-auto max-w-5xl px-page pb-28 pt-4 md:pb-8">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    {/* PRIMARY COLUMN — the trading-first vertical flow */}
                    <main className="col-span-1 flex flex-col gap-6 lg:col-span-2">
                        {/* Wide search surface directly under the nav (sm+ shows it in Topnav) */}
                        <div className="sm:hidden">
                            <Search placeholder="Search assets, traders, trends" />
                        </div>

                        {/* 1. MY MONEY */}
                        <HomeWalletSnapshot />

                        {/* 2. WHO TO FOLLOW */}
                        <TopTradersToFollow />

                        {/* 3. WHAT TO TRY — admin-managed promotion carousel */}
                        <PromotionSection />

                        {/* 4. QUICK ACTIONS */}
                        <QuickActionCards />

                        {/* 5. WHAT IS MOVING */}
                        <HomeMarketSnapshot />

                        {/* 6. DISCOVER */}
                        <DiscoverTransition />
                    </main>

                    {/* RIGHT SIDEBAR — contextual intelligence (desktop) */}
                    <aside className="col-span-1 sticky top-24 hidden h-fit flex-col gap-6 lg:flex">
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
