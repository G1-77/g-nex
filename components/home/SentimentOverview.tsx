// components/home/SentimentOverview.tsx
// Market sentiment: stacked bars for top discussed symbols (brief §16)
// Batched via get_sentiment_overview RPC to avoid N queries.

'use client'

import { useSentimentOverview } from '@/lib/react-query/home.queries'

function SentimentBar({ row }: { row: { asset_symbol: string; bullish: number | null; neutral: number | null; bearish: number | null } }) {
    const total = (row.bullish ?? 0) + (row.neutral ?? 0) + (row.bearish ?? 0)
    if (total === 0) {
        return (
            <div className="gnex-card p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-text-primary">{row.asset_symbol}</span>
                    <span className="text-xs text-text-muted">No sentiment data</span>
                </div>
                <div className="h-2 rounded-full bg-surface" />
            </div>
        )
    }

    const bullW = row.bullish ? (row.bullish / 100) : 0
    const neuW = row.neutral ? (row.neutral / 100) : 0
    const bearW = row.bearish ? (row.bearish / 100) : 0

    // Normalize to 100%
    const sum = bullW + neuW + bearW
    const normBull = sum > 0 ? bullW / sum : 0
    const normNeu = sum > 0 ? neuW / sum : 0
    const normBear = sum > 0 ? bearW / sum : 0

    return (
        <div className="gnex-card p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-text-primary">{row.asset_symbol}</span>
            </div>

            <div className="h-3 rounded-full overflow-hidden bg-surface mb-2">
                {normBull > 0 && (
                    <div className="h-full bg-success" style={{ width: `${normBull * 100}%` }} />
                )}
                {normNeu > 0 && (
                    <div className="h-full bg-warning" style={{ width: `${normNeu * 100}%` }} />
                )}
                {normBear > 0 && (
                    <div className="h-full bg-danger" style={{ width: `${normBear * 100}%` }} />
                )}
            </div>

            <div className="flex items-center gap-3 text-xs">
                {normBull > 0 && <span className="flex items-center gap-1 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Bullish {row.bullish}%</span>}
                {normNeu > 0 && <span className="flex items-center gap-1 text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Neutral {row.neutral}%</span>}
                {normBear > 0 && <span className="flex items-center gap-1 text-danger"><span className="h-1.5 w-1.5 rounded-full bg-danger" /> Bearish {row.bearish}%</span>}
            </div>
        </div>
    )
}

export default function SentimentOverview() {
    const { data: sentiment, isLoading } = useSentimentOverview(4)

    if (isLoading) {
        return (
            <section aria-label="Market sentiment" className="space-y-3">
                <h2 className="text-lg font-bold text-text-primary">Market sentiment</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse gnex-card p-3">
                            <div className="h-4 w-12 rounded bg-surface/40" />
                            <div className="mt-2 h-2 rounded-full bg-surface/40" />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (!sentiment || sentiment.length === 0) {
        return null // Don't render empty section
    }

    return (
        <section aria-label="Market sentiment" className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary">Market sentiment</h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {sentiment.map(row => (
                    <SentimentBar key={row.asset_symbol} row={row} />
                ))}
            </div>
        </section>
    )
}