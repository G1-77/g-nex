// components/home/TradingActivityFeed.tsx
// Compact real-time activity layer for Home (brief §14).
// "Alex opened a BTC position · Jane bought Gold" — minimal, privacy-safe.

'use client'

import { useMarketActivity } from '@/lib/react-query/home.queries'
import { useActivityRealtime } from '@/lib/hooks/useActivityRealtime'
import type { ActivityEvent } from '@/lib/react-query/home.queries'

const actionIcon = {
    position_opened: '📈',
    position_closed: '📉',
    analysis_published: '📝'
} as const satisfies Record<ActivityEvent['action'], string>

const actionLabel = {
    position_opened: 'opened a',
    position_closed: 'closed a',
    analysis_published: 'published analysis on'
} as const satisfies Record<ActivityEvent['action'], string>

function timeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
}

function ActivityRow({ event }: { event: ActivityEvent }) {
    const directionLabel = event.direction === 'Long' || event.direction === 'bullish'
        ? 'long'
        : event.direction === 'Short' || event.direction === 'bearish'
            ? 'short'
            : ''

    return (
        <div className="flex items-center gap-3 rounded-xl bg-surface p-3 transition-colors hover:bg-surface-hover gnex-card">
            <span className="text-lg" aria-hidden="true">
                {actionIcon[event.action]}
            </span>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">
                    <span className="font-semibold">{event.username}</span>{' '}
                    {actionLabel[event.action]}{' '}
                    <span className="font-mono font-semibold text-brand">{event.asset_symbol}</span>
                    {directionLabel && (
                        <span className="text-text-secondary ml-1">({directionLabel})</span>
                    )}
                </p>
                <p className="text-xs text-text-muted">{timeAgo(event.created_at)}</p>
            </div>
        </div>
    )
}

export default function TradingActivityFeed() {
    useActivityRealtime()
    const { data: activities, isLoading } = useMarketActivity(10)

    if (isLoading) {
        return (
            <section aria-label="Trading activity" className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-text-primary">Trading activity</h2>
                </div>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl bg-surface p-3">
                            <div className="h-4 w-1/4 rounded bg-surface/40" />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (!activities || activities.length === 0) {
        return (
            <section aria-label="Trading activity" className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-text-primary">Trading activity</h2>
                </div>
                <div className="gnex-card p-4 text-center">
                    <p className="text-text-muted text-sm">No trader activity yet.</p>
                    <p className="mt-1 text-body-sm text-text-muted">Discover traders to start building your Feed.</p>
                </div>
            </section>
        )
    }

    return (
        <section aria-label="Trading activity" className="space-y-2">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-text-primary">Trading activity</h2>
            </div>

            <div className="space-y-2">
                {activities.map(ev => (
                    <ActivityRow key={ev.id} event={ev} />
                ))}
            </div>
        </section>
    )
}