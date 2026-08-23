// components/home/FeedTransition.tsx
// End-of-Home transition into Feed (brief §26, §49, §50).
// Desktop: explicit CTA. Mobile: swipe hint + fallback CTA.

'use client'

import Link from 'next/link'
import { ChevronDown, ArrowUp } from 'lucide-react'

export default function FeedTransition() {
    return (
        <section className="py-8 px-page mx-auto max-w-2xl text-center">
            <div className="gnex-card p-8 rounded-2xl border border-border bg-surface">
                <div className="flex items-center justify-center gap-2 text-text-muted mb-4">
                    <ChevronDown className="h-5 w-5" />
                    <span className="text-sm font-medium">End of Home</span>
                    <ChevronDown className="h-5 w-5 rotate-180" />
                </div>

                <h3 className="text-lg font-bold text-text-primary mb-2">
                    You&apos;ve reached the end of Home.
                </h3>

                <p className="text-text-secondary text-sm mb-6">
                    Want to see more market conversations?
                </p>

                <div className="flex flex-col items-center gap-3">
                    <Link
                        href="/feed"
                        className="gnex-btn gnex-btn-primary w-full max-w-xs"
                    >
                        Explore Feed
                    </Link>

                    <p className="hidden md:block text-xs text-text-muted">
                        On mobile, swipe up to continue into Feed.
                    </p>

                    <div className="md:hidden flex items-center gap-2 text-xs text-text-muted">
                        <ArrowUp className="h-3.5 w-3.5 animate-bounce" />
                        <span>Swipe up to explore more</span>
                    </div>
                </div>
            </div>
        </section>
    )
}