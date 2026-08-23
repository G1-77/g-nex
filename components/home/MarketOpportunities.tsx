// components/home/MarketOpportunities.tsx
// Market opportunities: assets with discussion volume + price change + sparkline
// Brief §15 — connects market data with social activity

'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMarketOpportunities } from '@/lib/react-query/home.queries'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { OpportunityRow } from '@/lib/react-query/home.queries'

function OpportunityCard({
    opp,
    ticker,
    sparklinePath
}: {
    opp: OpportunityRow
    ticker: MarketTicker | undefined
    sparklinePath: string
}) {
    const changePct = ticker?.change24h ?? 0
    const isPositive = changePct >= 0

    return (
        <Link
            href={`/markets/${opp.asset_symbol}`}
            className="group gnex-card p-3 flex flex-col gap-2 rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
                        {opp.asset_symbol === 'XAU' ? (
                            <span className="text-brand font-bold text-sm">Au</span>
                        ) : opp.asset_symbol === 'USDT' ? (
                            <span className="text-emerald-400 font-bold text-sm">₮</span>
                        ) : (
                            <span className="font-mono text-xs font-bold text-text-primary">{opp.asset_symbol}</span>
                        )}
                    </div>
                    <span className="font-mono font-semibold text-text-primary">{opp.asset_symbol}</span>
                </div>

                <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-surface text-text-muted">
                    {opp.discussions} discussions
                </span>
            </div>

            <div className="flex items-end justify-between gap-2 pt-1">
                <div className="flex-1 min-w-0">
                    {ticker ? (
                        <>
                            <p className="text-body font-mono font-bold text-text-primary">
                                ${ticker.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className={`text-body-sm font-mono ${isPositive ? 'text-success' : 'text-danger'}`}>
                                {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                            </p>
                        </>
                    ) : (
                        <div className="animate-pulse space-y-1">
                            <div className="h-5 w-24 rounded bg-surface/40" />
                            <div className="h-4 w-16 rounded bg-surface/40" />
                        </div>
                    )}
                </div>

                <div className="shrink-0 w-24 h-12">
                    {sparklinePath && (
                        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="rgba(16,185,129,0)" />
                                    <stop offset="100%" stopColor="rgba(16,185,129,0.3)" />
                                </linearGradient>
                            </defs>
                            <path
                                d={sparklinePath}
                                stroke="rgb(16,185,129)"
                                strokeWidth="1.5"
                                fill="url(#grad)"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border-subtle">
                <span className="text-success">Bullish {opp.bullish_signals}</span>
                <span className="text-danger">Bearish {opp.bearish_signals}</span>
            </div>
        </Link>
    )
}

export default function MarketOpportunities() {
    const { data: opportunities, isLoading } = useMarketOpportunities(8)
    const symbols = useMemo(() => opportunities?.map(o => o.asset_symbol as 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'USDT' | 'XAU') ?? [], [opportunities])
    const { data: tickers } = useMarketPrices(symbols)

    const tickerMap = useMemo(() => {
        const map: Record<string, MarketTicker> = {}
        tickers?.forEach(t => { map[t.symbol] = t })
        return map
    }, [tickers])

    const sparklinePaths = useMemo(() => {
        const map: Record<string, string> = {}
        Object.values(tickerMap).forEach(t => {
            if (t.sparkline && t.sparkline.length > 1) {
                const arr = t.sparkline
                const min = Math.min(...arr)
                const max = Math.max(...arr)
                const range = max - min || 1
                map[t.symbol] = arr.map((v, i) => {
                    const x = (i / (arr.length - 1)) * 100
                    const y = 30 - ((v - min) / range) * 30
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
                }).join(' ')
            }
        })
        return map
    }, [tickerMap])

    if (isLoading) {
        return (
            <section aria-label="Market opportunities" className="space-y-3">
                <h2 className="text-lg font-bold text-text-primary">Market opportunities</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse gnex-card p-3">
                            <div className="h-4 w-20 rounded bg-surface/40" />
                            <div className="mt-2 h-5 w-16 rounded bg-surface/40" />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (!opportunities || opportunities.length === 0) {
        return (
            <section aria-label="Market opportunities" className="space-y-3">
                <h2 className="text-lg font-bold text-text-primary">Market opportunities</h2>
                <div className="gnex-card p-4 text-center">
                    <p className="text-text-muted">No market opportunities data yet.</p>
                </div>
            </section>
        )
    }

    return (
        <section aria-label="Market opportunities" className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary">Market opportunities</h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {opportunities.map(opp => (
                    <OpportunityCard
                        key={opp.asset_symbol}
                        opp={opp}
                        ticker={tickerMap[opp.asset_symbol]}
                        sparklinePath={sparklinePaths[opp.asset_symbol]}
                    />
                ))}
            </div>
        </section>
    )
}