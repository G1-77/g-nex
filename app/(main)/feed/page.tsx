// app/(main)/feed/page.tsx
// The dedicated social environment (brief §24). Home is the discovery surface;
// this page hosts the full chronological feed.

import type { Metadata } from 'next'

import FeedList from '@/components/feed/FeedList'
import TickerStrip from '@/components/feed/TickerStrip'

export const metadata: Metadata = {
  title: 'Feed · GNEX',
  description: 'Market discussions, trade ideas and analysis from the GNEX community.'
}

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-brand/20 md:pb-0">
      <TickerStrip />

      <div className="mx-auto max-w-2xl px-page py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-display font-black tracking-tight text-text-primary">Feed</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Market discussions, trade ideas and analysis.
          </p>
        </div>

        <FeedList />
      </div>
    </div>
  )
}
