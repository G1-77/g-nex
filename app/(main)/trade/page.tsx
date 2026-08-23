'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CandlestickChart, Clock, Lock, Zap } from 'lucide-react'

const products = [
  {
    name: 'Quick Trade',
    tagline: 'One-tap buy & sell',
    description: 'Execute instant market orders in seconds. Perfect for getting in and out of positions fast.',
    href: '/trade/quick',
    icon: Zap,
    accent: 'text-brand',
    accentBg: 'bg-brand-bg border-brand-border',
    enabled: true,
  },
  {
    name: 'Spot Pro',
    tagline: 'Full order terminal',
    description: 'Market, limit, stop and take-profit orders with live charts, open orders and trade history.',
    href: '/trade/spot',
    icon: CandlestickChart,
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-400/10 border-emerald-400/30',
    enabled: true,
  },
  {
    name: 'FTT',
    tagline: 'Fast Track Trading',
    description: 'Leveraged tokenized trades with automated risk management. Launching soon.',
    href: null,
    icon: Clock,
    accent: 'text-text-muted',
    accentBg: 'bg-surface border-border',
    enabled: false,
  },
]

export default function TradeHubPage() {
  return (
    <div className="mx-auto max-w-6xl px-page pb-24 pt-8 md:pb-12">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Trade
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          One wallet. One ledger. Three ways to trade.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {products.map((product, index) => {
          const Icon = product.icon
          const card = (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className={`group relative flex h-full flex-col rounded-3xl p-6 backdrop-blur-xl transition-colors gnex-card-elevated ${product.accentBg} ${
                product.enabled ? 'hover:shadow-card' : 'opacity-70'
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`rounded-2xl border bg-surface/40 p-3 ${product.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                {product.enabled ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-caption font-semibold uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-surface/40 px-2.5 py-1 text-caption font-semibold uppercase tracking-wider text-text-muted">
                    <Lock className="h-3 w-3" />
                    Soon
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-text-primary">{product.name}</h2>
              <p className={`text-caption font-mono uppercase tracking-wider ${product.accent}`}>
                {product.tagline}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
                {product.description}
              </p>

              {product.enabled && (
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary transition-transform group-hover:translate-x-0.5">
                  Open
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </motion.div>
          )

          return product.enabled ? (
            <Link key={product.name} href={product.href as string} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={product.name} className="h-full cursor-not-allowed" aria-disabled>
              {card}
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center text-caption text-text-muted">
        All orders execute against live market prices with transparent fees. KES settlement.
      </p>
    </div>
  )
}